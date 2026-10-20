import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import type { GraphNode, GraphEdge } from '@/lib/graph-utils';
import {
  personToGraphNode,
  relationshipToGraphEdge,
  inverseRelationshipToGraphEdge,
} from '@/lib/graph-utils';

export const GET = withAuth(async (request, session, context) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeRuledOut = searchParams.get('includeRuledOut') !== 'false';

    const [event, user] = await Promise.all([
      prisma.event.findFirst({
        where: {
          id,
          userId: session.user.id,
          deletedAt: null,
        },
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
                  relationshipToUser: {
                    select: {
                      label: true,
                      color: true,
                      inverse: { select: { label: true, color: true } },
                    },
                  },
                  groups: {
                    where: { group: { deletedAt: null } },
                    include: { group: { select: { id: true, name: true, color: true } } },
                  },
                  criminalRecords: {
                    where: { deletedAt: null },
                    select: { id: true, charge: true, recordType: true, isPardoned: true },
                  },
                  gangMemberships: {
                    select: {
                      gangId: true,
                      role: true,
                      gang: { select: { id: true, name: true, color: true } },
                    },
                  },
                  vehicles: {
                    where: { deletedAt: null },
                    select: { id: true, vehicleType: true, plateNumber: true, isSuspicious: true },
                  },
                  physicalMarks: {
                    where: { deletedAt: null },
                    select: { id: true, type: true, location: true },
                  },
                  bankAccounts: {
                    where: { deletedAt: null },
                    select: { id: true, accountType: true },
                  },
                  events: {
                    where: { deletedAt: null, event: { deletedAt: null } },
                    select: {
                      eventId: true,
                      involvementType: true,
                      verificationStatus: true,
                      confidence: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          relationshipsFrom: {
            where: { deletedAt: null, toEvent: { deletedAt: null } },
            include: {
              toEvent: {
                select: {
                  id: true,
                  title: true,
                  caseCode: true,
                  category: true,
                  status: true,
                  photo: true,
                  groups: {
                    where: { group: { deletedAt: null } },
                    include: { group: { select: { id: true, name: true, color: true } } },
                  },
                },
              },
            },
          },
          relationshipsTo: {
            where: { deletedAt: null, fromEvent: { deletedAt: null } },
            include: {
              fromEvent: {
                select: {
                  id: true,
                  title: true,
                  caseCode: true,
                  category: true,
                  status: true,
                  photo: true,
                  groups: {
                    where: { group: { deletedAt: null } },
                    include: { group: { select: { id: true, name: true, color: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { nameOrder: true, nameDisplayFormat: true },
      }),
    ]);

    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const nameOrder = user?.nameOrder;
    const nameDisplayFormat = user?.nameDisplayFormat;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    // 1. Center Node: The current Event
    const centerEventNodeId = `event-${event.id}`;
    const eventColors =
      event.groups.length > 0
        ? event.groups.map((eg) => eg.group.color || '#3B82F6')
        : ['#3B82F6'];

    nodes.push({
      id: centerEventNodeId,
      label: `📁 ${event.caseCode ? `[${event.caseCode}] ` : ''}${event.title}`,
      groups: event.groups.map((eg) => eg.group.id),
      colors: eventColors,
      isCenter: true,
      photo: event.photo,
      nodeType: 'event',
      eventStatus: event.status,
    });
    nodeIds.add(centerEventNodeId);

    // Verification style helper
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

    // 2. Add Participants (Person nodes) & Edge to center event
    const participantIds = new Set<string>();
    for (const pe of event.people) {
      const person = pe.person;
      if (!nodeIds.has(person.id)) {
        nodes.push(personToGraphNode(person as any, false, nameOrder, nameDisplayFormat));
        nodeIds.add(person.id);
        participantIds.add(person.id);
      }

      const style = getVerificationStyle(pe.verificationStatus);
      const labelParts: string[] = [];
      if (pe.role) labelParts.push(pe.role);
      if (pe.involvementType) labelParts.push(pe.involvementType);

      edges.push({
        source: person.id,
        target: centerEventNodeId,
        type: labelParts.length > 0 ? labelParts.join(' · ') : 'Liên can',
        color: style.color,
        ...(style.lineStyle ? { lineStyle: style.lineStyle } : {}),
        ...(pe.verificationStatus ? { verificationStatus: pe.verificationStatus } : {}),
        ...(pe.involvementType ? { involvementType: pe.involvementType } : {}),
      });
    }

    // 3. Add Related Events nodes & edges
    const seenEventEdges = new Set<string>();

    for (const rel of event.relationshipsFrom) {
      const toEvent = rel.toEvent;
      const toEventNodeId = `event-${toEvent.id}`;
      if (!nodeIds.has(toEventNodeId)) {
        nodes.push({
          id: toEventNodeId,
          label: `📁 ${toEvent.caseCode ? `[${toEvent.caseCode}] ` : ''}${toEvent.title}`,
          groups: toEvent.groups.map((eg) => eg.group.id),
          colors:
            toEvent.groups.length > 0
              ? toEvent.groups.map((eg) => eg.group.color || '#F59E0B')
              : ['#F59E0B'],
          isCenter: false,
          photo: toEvent.photo,
          nodeType: 'event',
          eventStatus: toEvent.status,
        });
        nodeIds.add(toEventNodeId);
      }

      const pairKey = [centerEventNodeId, toEventNodeId].sort().join('--');
      if (!seenEventEdges.has(pairKey)) {
        seenEventEdges.add(pairKey);
        edges.push({
          source: centerEventNodeId,
          target: toEventNodeId,
          type: rel.relationshipType || 'Vụ án liên đới',
          color: '#D97706',
          lineStyle: 'dashed',
        });
      }
    }

    for (const rel of event.relationshipsTo) {
      const fromEvent = rel.fromEvent;
      const fromEventNodeId = `event-${fromEvent.id}`;
      if (!nodeIds.has(fromEventNodeId)) {
        nodes.push({
          id: fromEventNodeId,
          label: `📁 ${fromEvent.caseCode ? `[${fromEvent.caseCode}] ` : ''}${fromEvent.title}`,
          groups: fromEvent.groups.map((eg) => eg.group.id),
          colors:
            fromEvent.groups.length > 0
              ? fromEvent.groups.map((eg) => eg.group.color || '#F59E0B')
              : ['#F59E0B'],
          isCenter: false,
          photo: fromEvent.photo,
          nodeType: 'event',
          eventStatus: fromEvent.status,
        });
        nodeIds.add(fromEventNodeId);
      }

      const pairKey = [fromEventNodeId, centerEventNodeId].sort().join('--');
      if (!seenEventEdges.has(pairKey)) {
        seenEventEdges.add(pairKey);
        edges.push({
          source: fromEventNodeId,
          target: centerEventNodeId,
          type: rel.relationshipType || 'Vụ án liên đới',
          color: '#D97706',
          lineStyle: 'dashed',
        });
      }
    }

    // 4. Interpersonal relationships between participants
    if (participantIds.size > 1) {
      const interRelationships = await prisma.relationship.findMany({
        where: {
          person: { userId: session.user.id },
          deletedAt: null,
          personId: { in: Array.from(participantIds) },
          relatedPersonId: { in: Array.from(participantIds) },
        },
        include: {
          relationshipType: {
            where: { deletedAt: null },
            select: {
              label: true,
              color: true,
              category: true,
              directionType: true,
              lineStyle: true,
              inverse: {
                where: { deletedAt: null },
                select: {
                  label: true,
                  color: true,
                  category: true,
                  directionType: true,
                  lineStyle: true,
                },
              },
            },
          },
        },
      });

      const dedupedPersonEdges = new Map<string, GraphEdge>();
      for (const rel of interRelationships) {
        const edge = relationshipToGraphEdge(rel as any);
        if (edge) {
          dedupedPersonEdges.set(`${edge.source}-${edge.target}`, edge);
        }
        const invEdge = inverseRelationshipToGraphEdge(rel as any);
        if (invEdge) {
          dedupedPersonEdges.set(`${invEdge.source}-${invEdge.target}`, invEdge);
        }
      }
      edges.push(...dedupedPersonEdges.values());
    }

    // Enrich edges with labels for tooltips
    const nodeLabels = new Map<string, string>();
    nodes.forEach((n) => nodeLabels.set(n.id, n.label));

    const enrichedEdges = edges.map((e) => ({
      ...e,
      sourceLabel: nodeLabels.get(e.source) || '',
      targetLabel: nodeLabels.get(e.target) || '',
    }));

    return apiResponse.ok({ nodes, edges: enrichedEdges });
  } catch (error) {
    return handleApiError(error, 'event-graph');
  }
});

