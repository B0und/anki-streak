import { useActor } from '@xstate/react';
import { Effect } from 'effect';
import { CheckSquare, Square } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';
import { setup, types } from 'xstate';

import { getDueReviewExcludedDecks, readDecks, setDueReviewExcludedDecks, type AnkiDeck } from './activity';
import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { Action } from './studyComponents';

const deckSetup = setup({
  schemas: {
    context: types<{ decks: readonly AnkiDeck[]; excluded: readonly string[] }>(),
    events: { reload: types<void>(), toggle: types<{ id: string }>() },
  },
});

const dueReviewDecks = deckSetup.createMachine({
  id: 'dueReviewDecks',
  context: () => ({ decks: [], excluded: getDueReviewExcludedDecks() }),
  initial: 'loading',
  states: {
    loading: {
      invoke: deckSetup.createInvoke({
        src: ({ signal }) => Effect.runPromise(readDecks, { signal }),
        onDone: ({ context, event }) => ({ target: 'ready', context: { ...context, decks: event.output } }),
        onError: { target: 'unavailable' },
      }),
    },
    ready: {
      on: {
        reload: { target: 'loading' },
        toggle: ({ context, event }, enq) => {
          const excluded = context.excluded.includes(event.id)
            ? context.excluded.filter((id) => id !== event.id)
            : [...context.excluded, event.id];
          enq(setDueReviewExcludedDecks, excluded);
          return { context: { ...context, excluded } };
        },
      },
    },
    unavailable: { on: { reload: { target: 'loading' } } },
  },
});

export function DueReviewDecks({ language, palette }: { language: Language; palette: Palette }) {
  const [snapshot, send] = useActor(dueReviewDecks);
  const { decks, excluded } = snapshot.context;

  return <YStack gap={6} pt={12} borderTopWidth={1} borderTopColor="border-color">
    <Text accessibilityRole="header" color="color" fontWeight="700">{copy(language, 'excludedDueDecks')}</Text>
    <Text color="muted" fontSize={13}>{copy(language, 'excludedDueDecksDetail')}</Text>
    {snapshot.matches('loading') && <Text color="muted">{copy(language, 'loadingDueDecks')}</Text>}
    {snapshot.matches('unavailable') && <>
      <Text color="muted">{copy(language, 'unavailableDueDecks')}</Text>
      <Action onPress={() => send({ type: 'reload' })}>{copy(language, 'reloadDueDecks')}</Action>
    </>}
    {snapshot.matches('ready') && <>
      {decks.map(({ id, name }) => {
        const checked = excluded.includes(id);
        return <XStack key={id} accessibilityRole="checkbox" accessibilityState={{ checked }}
          onPress={() => send({ type: 'toggle', id })} minH={48} px={10} py={8} gap={10} items="center"
          rounded={9} bg={checked ? 'subtle' : 'surface'} opacity="press:0.75">
          {checked ? <CheckSquare size={18} color={palette.accent} /> : <Square size={18} color={palette.muted} />}
          <Text color="color" flex={1}>{name}</Text>
        </XStack>;
      })}
      {decks.length === 0 && <Text color="muted">{copy(language, 'emptyDueDecks')}</Text>}
      <Action onPress={() => send({ type: 'reload' })}>{copy(language, 'reloadDueDecks')}</Action>
    </>}
  </YStack>;
}
