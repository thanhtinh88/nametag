import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import type { GraphNode, GraphEdge } from '@/lib/graph-utils';
import {
  userToGraphNode,
  personToGraphNode,
  relationshipsWithUserToGraphEdges,
  relationshipToGraphEdge,
  inverseRelationshipToGraphEdge,
} from '@/lib/graph-utils';

type DashboardGraphPerson = {
  id: string;
  name: string;
  surname: string | null;
  middleName?: string | null;
  nickname: string | null;
  displayNameOverride: string | null;
  photo: string | null;
  relationshipToUser: {
    label: string;
    color: string | null;
    inverse: {
      label: string;
      color: string | null;
    } | null;
  } | null;
  groups: Array<{
    group: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
  relationshipsFrom: Array<{
    personId: string;
    relatedPersonId: string;
    relationshipType: {
      label: string;
      color: string | null;
      inverse: {
        label: string;
        color: string | null;
      } | null;
    } | null;
  }>;
};

export const GET = withAuth(async (request, session) => {
  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);

    const parseGroupIds = (value: string | null) =>
      Array.from(
        new Set(
          (value ?? '')
            .split(',')
            .map((groupId) => groupId.trim())
            .filter(Boolean),
        ),
      );

    const includeGroupIds = parseGroupIds(searchParams.get('includeGroupIds'));
    const excludeGroupIds = parseGroupIds(searchParams.get('excludeGroupIds'));
    const limit = searchParams.get('limit');
    const hideUserNode = searchParams.get('hideUserNode') === 'true';
    const caseId = searchParams.get('caseId')?.trim() || '';
    const includeHop = searchParams.get('includeHop') !== 'false';
    const includeSolvedCases = searchParams.get('includeSolvedCases') !== 'false';
    const includeRuledOut = searchParams.get('includeRuledOut') !== 'false';
    const customFieldFilter = searchParams.get('cf')?.trim() || '';

    const includePredicates: Array<Record<string, unknown>> = [];
    const excludePredicates: Array<Record<string, unknown>> = [];

    // Build atomic predicates for included and excluded groups
    includeGroupIds.forEach((groupId) => {
      includePredicates.push({
        groups: {
          some: {
            groupId,
            group: {
              deletedAt: null,
            },
          },
        },
      });
    });

    excludeGroupIds.forEach((groupId) => {
      excludePredicates.push({
        NOT: {
          groups: {
            some: {
              groupId,
              group: {
                deletedAt: null,
              },
            },
          },
        },
      });
    });

    // Build where clause
    const groupOperator = searchParams.get('groupMatchOperator') === 'and' ? 'AND' : 'OR';
    const includeGroupClause =
      includePredicates.length > 0 ? { [groupOperator]: includePredicates } : null;
    const filterPredicates: Array<Record<string, unknown>> = [];

    if (includeGroupClause) {
      filterPredicates.push(includeGroupClause);
    }
    filterPredicates.push(...excludePredicates);

    if (customFieldFilter) {
      const colonIdx = customFieldFilter.indexOf(':');
      const cfSlug = colonIdx >= 0 ? customFieldFilter.slice(0, colonIdx).trim() : customFieldFilter;
      const cfVal = colonIdx >= 0 ? customFieldFilter.slice(colonIdx + 1).trim() : '';
      if (cfSlug) {
        filterPredicates.push({
          customFieldValues: {
            some: {
              template: { slug: cfSlug, deletedAt: null },
              ...(cfVal ? { value: { contains: cfVal, mode: 'insensitive' } } : {}),
            },
          },
        });
      }
    }

    const whereClause = {
      userId: session.user.id,
      deletedAt: null,
      ...(filterPredicates.length > 0 ? { AND: filterPredicates } : {}),
    };

    // Fetch people with optimized select to minimize payload
    const allPeople = (await prisma.person.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        surname: true,
        middleName: true,
        nickname: true,
        displayNameOverride: true,
        photo: true,
        relationshipToUser: {
          where: {
            deletedAt: null,
          },
          select: {
            label: true,
            color: true,
            inverse: {
              where: {
                deletedAt: null,
              },
              select: {
                label: true,
                color: true,
              },
            },
          },
        },
        groups: {
          where: {
            group: {
              deletedAt: null,
            },
          },
          select: {
            group: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        relationshipsFrom: {
          where: {
            deletedAt: null,
            relatedPerson: {
              deletedAt: null,
            },
          },
          select: {
            personId: true,
            relatedPersonId: true,
            relationshipType: {
              where: {
                deletedAt: null,
              },
              select: {
                label: true,
                color: true,
                inverse: {
                  where: {
                    deletedAt: null,
                  },
                  select: {
                    label: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
        managementLevel: true,
        threatLevel: true,
        residenceStatus: true,
        gender: true,
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
      orderBy: {
        name: 'asc',
      },
      ...(limit ? { take: parseInt(limit) } : {}),
    })) as unknown as DashboardGraphPerson[];

    // Pre-fetch events if prisma.event is available so we can filter people by caseId if requested
    type DashboardGraphEvent = {
      id: string;
      title: string;
      status?: string;
      photo: string | null;
      groups: Array<{ group: { id: string; name: string; color: string | null } }>;
      people: Array<{
        personId: string;
        role: string | null;
        involvementType?: string;
        verificationStatus?: string;
        confidence?: string | null;
      }>;
      relationshipsFrom: Array<{ toEventId: string; relationshipType: string | null }>;
    };

    let events: DashboardGraphEvent[] = [];
    if (prisma.event?.findMany) {
      const eventWhere: Record<string, unknown> = {
        userId: session.user.id,
        deletedAt: null,
        ...(includeGroupClause ? { AND: [includeGroupClause, ...excludePredicates] } : excludePredicates.length > 0 ? { AND: excludePredicates } : {}),
      };
      if (caseId) {
        eventWhere.id = caseId;
      } else if (!includeSolvedCases) {
        eventWhere.status = { in: ['PLANNED', 'ONGOING'] };
      }

      events = (await prisma.event.findMany({
        where: eventWhere,
        select: {
          id: true,
          title: true,
          status: true,
          photo: true,
          groups: {
            where: { group: { deletedAt: null } },
            select: { group: { select: { id: true, name: true, color: true } } },
          },
          people: {
            where: {
              deletedAt: null,
              person: { deletedAt: null },
              ...(!includeRuledOut ? { verificationStatus: { not: 'RULED_OUT' } } : {}),
            },
            select: {
              personId: true,
              role: true,
              involvementType: true,
              verificationStatus: true,
              confidence: true,
            },
          },
          relationshipsFrom: {
            where: { deletedAt: null, toEvent: { deletedAt: null } },
            select: { toEventId: true, relationshipType: true },
          },
        },
      })) as unknown as DashboardGraphEvent[];
    }

    // Filter people when a specific caseId is focused
    let people = allPeople;
    if (caseId && events.length > 0) {
      const directPersonIds = new Set<string>();
      for (const ev of events) {
        for (const pe of ev.people) {
          directPersonIds.add(pe.personId);
        }
      }
      const allowedPersonIds = new Set<string>(directPersonIds);
      if (includeHop) {
        for (const p of allPeople) {
          if (directPersonIds.has(p.id)) {
            for (const rel of p.relationshipsFrom) {
              allowedPersonIds.add(rel.relatedPersonId);
            }
          } else {
            for (const rel of p.relationshipsFrom) {
              if (directPersonIds.has(rel.relatedPersonId)) {
                allowedPersonIds.add(p.id);
              }
            }
          }
        }
      }
      people = allPeople.filter((p) => allowedPersonIds.has(p.id));
    }

    // Build graph data
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    // Fetch user photo and name order preference for the center node
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photo: true, nameOrder: true, nameDisplayFormat: true },
    });
    const nameOrder = user?.nameOrder;
    const nameDisplayFormat = user?.nameDisplayFormat;

    const userId = `user-${session.user.id}`;
    if (!hideUserNode) {
      // Add user as the center node
      nodes.push(userToGraphNode(userId, true, user?.photo));
      nodeIds.add(userId);
    }

    // Add all people as nodes
    people.forEach((person) => {
      nodes.push(personToGraphNode(person, false, nameOrder, nameDisplayFormat));
      nodeIds.add(person.id);

      // Connect each person to the user with their specific relationship (if they have a direct one)
      if (!hideUserNode) {
        edges.push(...relationshipsWithUserToGraphEdges(person, userId));
      }
    });

    // Add all relationships between people as edges (deduplicated)
    const dedupedEdges = new Map<string, GraphEdge>();

    people.forEach((person) => {
      // only add edges when both people are present in the graph
      person.relationshipsFrom
        .filter((r) => nodeIds.has(r.relatedPersonId))
        .map(relationshipToGraphEdge)
        .filter((e) => e !== undefined)
        .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
        });

      // include the inverse relationships too
      person.relationshipsFrom
        .filter((r) => nodeIds.has(r.relatedPersonId))
        .map(inverseRelationshipToGraphEdge)
        .filter((e) => e !== undefined)
        .forEach((e) => {
          dedupedEdges.set(`${e.source}-${e.target}`, e);
        });
    });

    edges.push(...dedupedEdges.values());

    if (events.length > 0) {
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

      const eventNodeIds = new Set<string>();
      for (const ev of events) {
        const eventNodeId = `event-${ev.id}`;
        nodes.push({
          id: eventNodeId,
          label: `📅 ${ev.title}`,
          groups: ev.groups.map((eg) => eg.group.id),
          colors:
            ev.groups.length > 0
              ? ev.groups.map((eg) => eg.group.color || '#F59E0B')
              : ['#F59E0B'],
          isCenter: caseId === ev.id,
          photo: ev.photo,
          nodeType: 'event',
          eventStatus: ev.status,
        });
        eventNodeIds.add(eventNodeId);
        nodeIds.add(eventNodeId);

        for (const pe of ev.people) {
          if (nodeIds.has(pe.personId)) {
            const style = getVerificationStyle(pe.verificationStatus);
            const labelParts: string[] = [];
            if (pe.role) labelParts.push(pe.role);
            if (pe.involvementType && pe.involvementType !== 'OTHER') {
              labelParts.push(pe.involvementType);
            }
            const edgeLabel = labelParts.length > 0 ? labelParts.join(' · ') : 'Event';
            edges.push({
              source: pe.personId,
              target: eventNodeId,
              type: edgeLabel,
              color: style.color,
              ...(style.lineStyle ? { lineStyle: style.lineStyle } : {}),
              ...(pe.verificationStatus ? { verificationStatus: pe.verificationStatus } : {}),
              ...(pe.involvementType ? { involvementType: pe.involvementType } : {}),
            });
          }
        }
      }

      const seenEventEdges = new Set<string>();
      for (const ev of events) {
        const sourceId = `event-${ev.id}`;
        for (const rel of ev.relationshipsFrom) {
          const targetId = `event-${rel.toEventId}`;
          if (!eventNodeIds.has(targetId)) continue;
          const pairKey = [sourceId, targetId].sort().join('--');
          if (seenEventEdges.has(pairKey)) continue;
          seenEventEdges.add(pairKey);
          edges.push({
            source: sourceId,
            target: targetId,
            type: rel.relationshipType || 'Related Case',
            color: '#D97706',
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
    return handleApiError(error, 'dashboard-graph');
  }
});
