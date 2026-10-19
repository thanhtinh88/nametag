import { prisma } from '@/lib/prisma';
import { findPersonForGraph } from '@/lib/prisma-queries';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import type { GraphNode, GraphEdge } from '@/lib/graph-utils';
import {
  userToGraphNode,
  personToGraphNode,
  relationshipsWithUserToGraphEdges,
  relationshipToGraphEdge,
  inverseRelationshipToGraphEdge,
} from '@/lib/graph-utils';

export const GET = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const hideUserNode = searchParams.get('hideUserNode') !== 'false';
    const includeSolvedCases = searchParams.get('includeSolvedCases') !== 'false';
    const includeRuledOut = searchParams.get('includeRuledOut') !== 'false';

    // Fetch the person with all their relationships
    const person = await findPersonForGraph(id, session.user.id);

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    // Build graph data
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    // Fetch user photo and name order preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photo: true, nameOrder: true, nameDisplayFormat: true },
    });
    const nameOrder = user?.nameOrder;
    const nameDisplayFormat = user?.nameDisplayFormat;

    // Add center node (the person we're viewing)
    nodes.push(personToGraphNode(person, true, nameOrder, nameDisplayFormat));
    nodeIds.add(person.id);

    const userId = `user-${session.user.id}`;
    if (!hideUserNode) {
      // Add user as a node
      nodes.push(userToGraphNode(userId, false, user?.photo));
      nodeIds.add(userId);

      // if person has direct relationship to user, add them
      edges.push(...relationshipsWithUserToGraphEdges(person, userId));
    }

    // Add related people as nodes
    person.relationshipsFrom.forEach((rel) => {
      nodes.push(personToGraphNode(rel.relatedPerson, false, nameOrder, nameDisplayFormat));
      nodeIds.add(rel.relatedPersonId);

      // If the related person has direct relationship to the user, add them
      if (!hideUserNode) {
        edges.push(
          ...relationshipsWithUserToGraphEdges(rel.relatedPerson, userId),
        );
      }
    });

    // Build edges with deduplication
    const dedupedEdges = new Map<string, GraphEdge>();

    // Add edges from center person to related people
    person.relationshipsFrom
      .map(relationshipToGraphEdge)
      .filter((e) => e !== undefined)
      .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
      });

    // include the inverse relationships too
    person.relationshipsFrom
      .map(inverseRelationshipToGraphEdge)
      .filter((e) => e !== undefined)
      .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
      });

    // Add edges between related people (relationships within the network)
    person.relationshipsFrom.forEach((rel) => {
      if (!rel.relatedPerson.relationshipsFrom) {
        return;
      }

      // Find relationships from this related person to other related people
      // and add edge only if this other related person's already in the graph
      rel.relatedPerson.relationshipsFrom
        .filter((r) => nodeIds.has(r.relatedPersonId))
        .map(relationshipToGraphEdge)
        .filter((e) => e !== undefined)
        .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
        });

      // include the inverse relationships too
      rel.relatedPerson.relationshipsFrom
        .filter((r) => nodeIds.has(r.relatedPersonId))
        .map(inverseRelationshipToGraphEdge)
        .filter((e) => e !== undefined)
        .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
        });
    });

    edges.push(...dedupedEdges.values());

    if (prisma.personEvent?.findMany) {
      const getVerificationStyle = (status?: string): { color: string; lineStyle?: 'solid' | 'dashed' | 'dotted' } => {
        switch (status) {
          case 'CONFIRMED':
            return { color: '#EF4444', lineStyle: 'solid' };
          case 'INVESTIGATING':
            return { color: '#F97316', lineStyle: 'dashed' };
          case 'HYPOTHESIS':
            return { color: '#EAB308', lineStyle: 'dashed' };
          case 'RULED_OUT':
            return { color: '#6B7280', lineStyle: 'dotted' };
          default:
            return { color: '#F59E0B' };
        }
      };

      const personEvents = await prisma.personEvent.findMany({
        where: {
          personId: person.id,
          deletedAt: null,
          ...(!includeRuledOut ? { verificationStatus: { not: 'RULED_OUT' } } : {}),
          event: {
            userId: session.user.id,
            deletedAt: null,
            ...(!includeSolvedCases ? { status: { in: ['PLANNED', 'ONGOING'] } } : {}),
          },
        },
        include: {
          event: {
            include: {
              groups: {
                where: { group: { deletedAt: null } },
                include: { group: { select: { id: true, name: true, color: true } } },
              },
              people: {
                where: {
                  deletedAt: null,
                  person: { deletedAt: null },
                  ...(!includeRuledOut ? { verificationStatus: { not: 'RULED_OUT' } } : {}),
                },
                include: {
                  person: {
                    include: {
                      groups: {
                        where: { group: { deletedAt: null } },
                        include: { group: { select: { id: true, name: true, color: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const pe of personEvents) {
        const ev = pe.event;
        const eventNodeId = `event-${ev.id}`;
        if (!nodeIds.has(eventNodeId)) {
          nodes.push({
            id: eventNodeId,
            label: `📅 ${ev.title}`,
            groups: ev.groups.map((eg) => eg.group.id),
            colors:
              ev.groups.length > 0
                ? ev.groups.map((eg) => eg.group.color || '#F59E0B')
                : ['#F59E0B'],
            isCenter: false,
            photo: ev.photo,
            nodeType: 'event',
            eventStatus: ev.status,
          });
          nodeIds.add(eventNodeId);
        }

        const peStyle = getVerificationStyle(pe.verificationStatus);
        const peLabelParts: string[] = [];
        if (pe.role) peLabelParts.push(pe.role);
        if (pe.involvementType && pe.involvementType !== 'OTHER') {
          peLabelParts.push(pe.involvementType);
        }
        edges.push({
          source: person.id,
          target: eventNodeId,
          type: peLabelParts.length > 0 ? peLabelParts.join(' · ') : 'Event',
          color: peStyle.color,
          ...(peStyle.lineStyle ? { lineStyle: peStyle.lineStyle } : {}),
          ...(pe.verificationStatus ? { verificationStatus: pe.verificationStatus } : {}),
          ...(pe.involvementType ? { involvementType: pe.involvementType } : {}),
        });

        for (const otherPe of ev.people) {
          if (otherPe.personId === person.id) continue;
          if (!nodeIds.has(otherPe.personId)) {
            nodes.push(
              personToGraphNode(
                otherPe.person,
                false,
                nameOrder,
                nameDisplayFormat
              )
            );
            nodeIds.add(otherPe.personId);
          }
          const otherStyle = getVerificationStyle(otherPe.verificationStatus);
          const otherLabelParts: string[] = [];
          if (otherPe.role) otherLabelParts.push(otherPe.role);
          if (otherPe.involvementType && otherPe.involvementType !== 'OTHER') {
            otherLabelParts.push(otherPe.involvementType);
          }
          edges.push({
            source: otherPe.personId,
            target: eventNodeId,
            type: otherLabelParts.length > 0 ? otherLabelParts.join(' · ') : 'Event',
            color: otherStyle.color,
            ...(otherStyle.lineStyle ? { lineStyle: otherStyle.lineStyle } : {}),
            ...(otherPe.verificationStatus ? { verificationStatus: otherPe.verificationStatus } : {}),
            ...(otherPe.involvementType ? { involvementType: otherPe.involvementType } : {}),
          });
        }
      }
    }

    // Enrich edges with source and target labels for tooltip display
    const nodeLabels = new Map<string, string>();
    nodes.forEach((n) => nodeLabels.set(n.id, n.label));

    const enrichedEdges = edges.map((e) => ({
      ...e,
      sourceLabel: nodeLabels.get(e.source) || '',
      targetLabel: nodeLabels.get(e.target) || '',
    }));

    return apiResponse.ok({ nodes, edges: enrichedEdges });
  } catch (error) {
    return handleApiError(error, 'people-graph');
  }
});
