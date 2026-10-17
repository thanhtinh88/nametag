'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import PillSelector from '@/components/PillSelector';
import { formatFullName, formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';

interface PersonOption {
  id: string;
  name: string;
  surname: string | null;
  nickname: string | null;
  displayNameOverride?: string | null;
}

interface EventOption {
  id: string;
  title: string;
}

interface PillPerson {
  id: string;
  label: string;
}

interface JournalFiltersProps {
  people: PersonOption[];
  events?: EventOption[];
  currentPersonIds: string[];
  currentEventIds?: string[];
  currentSearch?: string;
  nameOrder: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

export default function JournalFilters({
  people,
  events = [],
  currentPersonIds,
  currentEventIds = [],
  currentSearch,
  nameOrder,
  nameDisplayFormat,
}: JournalFiltersProps) {
  const t = useTranslations('journal');
  const router = useRouter();

  const pillPeople: PillPerson[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: formatGraphName(p, nameOrder, nameDisplayFormat) })),
    [people, nameOrder, nameDisplayFormat],
  );

  const dropdownPeople: PillPerson[] = useMemo(
    () => people.map((p) => ({ id: p.id, label: formatFullName(p, nameOrder) })),
    [people, nameOrder],
  );

  const pillEvents: PillPerson[] = useMemo(
    () => events.map((ev) => ({ id: ev.id, label: ev.title })),
    [events],
  );

  const selectedPeople = useMemo(
    () =>
      currentPersonIds
        .map((id) => pillPeople.find((p) => p.id === id))
        .filter((p): p is PillPerson => p !== undefined),
    [currentPersonIds, pillPeople],
  );

  const selectedEvents = useMemo(
    () =>
      currentEventIds
        .map((id) => pillEvents.find((ev) => ev.id === id))
        .filter((ev): ev is PillPerson => ev !== undefined),
    [currentEventIds, pillEvents],
  );

  function navigate(personIds: string[], eventIds: string[], search?: string) {
    const url = new URL('/journal', window.location.origin);
    if (personIds.length > 0) url.searchParams.set('person', personIds.join(','));
    if (eventIds.length > 0) url.searchParams.set('event', eventIds.join(','));
    if (search) url.searchParams.set('q', search);
    router.push(url.pathname + url.search);
  }

  function handleAddPerson(person: PillPerson) {
    navigate(
      [...selectedPeople.map((p) => p.id), person.id],
      selectedEvents.map((ev) => ev.id),
      currentSearch,
    );
  }

  function handleRemovePerson(personId: string) {
    navigate(
      selectedPeople.filter((p) => p.id !== personId).map((p) => p.id),
      selectedEvents.map((ev) => ev.id),
      currentSearch,
    );
  }

  function handleAddEvent(ev: PillPerson) {
    navigate(
      selectedPeople.map((p) => p.id),
      [...selectedEvents.map((e) => e.id), ev.id],
      currentSearch,
    );
  }

  function handleRemoveEvent(eventId: string) {
    navigate(
      selectedPeople.map((p) => p.id),
      selectedEvents.filter((e) => e.id !== eventId).map((e) => e.id),
      currentSearch,
    );
  }

  return (
    <div className="space-y-3 mb-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const q = formData.get('q') as string;
          navigate(
            selectedPeople.map((p) => p.id),
            selectedEvents.map((ev) => ev.id),
            q || undefined,
          );
        }}
      >
        <input
          type="search"
          name="q"
          key={currentSearch ?? ''}
          defaultValue={currentSearch ?? ''}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary text-base sm:text-sm"
        />
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PillSelector
          selectedItems={selectedPeople}
          availableItems={dropdownPeople.filter((p) => !selectedPeople.some((s) => s.id === p.id))}
          onAdd={handleAddPerson}
          onRemove={handleRemovePerson}
          placeholder={t('filterByPerson')}
          showAllOnFocus
        />
        {pillEvents.length > 0 && (
          <PillSelector
            selectedItems={selectedEvents}
            availableItems={pillEvents.filter((ev) => !selectedEvents.some((s) => s.id === ev.id))}
            onAdd={handleAddEvent}
            onRemove={handleRemoveEvent}
            placeholder="Filter by Case (Vụ án)..."
            showAllOnFocus
          />
        )}
      </div>
    </div>
  );
}
