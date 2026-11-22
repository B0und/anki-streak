import { useLingui } from '@lingui/react';
import { useActor } from '@xstate/react';
import { Effect } from 'effect';
import { CheckSquare, Square } from 'lucide-react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { setup, types } from 'xstate';

import { getDueReviewExcludedDecks, readDecks, setDueReviewExcludedDecks, type AnkiDeck } from './activity';
import type { Palette } from './appearance';
import { messages } from './messages';
import { settingsIconGap, settingsRowPadding } from './screenLayout';
import { Action, SettingsIconSlot } from './studyComponents';

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

export function DueReviewDecks({ palette }: { palette: Palette }) {
  const { _ } = useLingui();
  const [snapshot, send] = useActor(dueReviewDecks);
  const { decks, excluded } = snapshot.context;
  const loading = snapshot.matches('loading');
  const unavailable = snapshot.matches('unavailable');

  return <YStack gap={6} pt={12} borderTopWidth={1} borderTopColor="border-color">
    <Text accessibilityRole="header" color="color" fontWeight="700">{_(messages.excludedDueDecks)}</Text>
    <Text color="muted" fontSize={13}>{_(messages.excludedDueDecksDetail)}</Text>
    <ScrollView h={136} mx={-settingsRowPadding} nestedScrollEnabled>
      {decks.map(({ id, name }) => {
        const checked = excluded.includes(id);
        return <XStack key={id} accessibilityRole="checkbox" accessibilityState={{ checked }}
          onPress={loading || unavailable ? undefined : () => send({ type: 'toggle', id })} minH={48}
          px={settingsRowPadding} py={8} gap={settingsIconGap} items="center"
          rounded={9} bg={checked ? 'subtle' : 'surface'} opacity="press:0.75">
          <SettingsIconSlot>
            {checked ? <CheckSquare size={18} color={palette.accent} /> : <Square size={18} color={palette.muted} />}
          </SettingsIconSlot>
          <Text color="color" flex={1}>{name}</Text>
        </XStack>;
      })}
      {(decks.length === 0 || unavailable) && <Text color="muted" mx={settingsRowPadding} accessibilityLiveRegion="polite">
        {_(messages[unavailable ? 'unavailableDueDecks' : loading ? 'loadingDueDecks' : 'emptyDueDecks'])}
      </Text>}
    </ScrollView>
    <Action disabled={loading} onPress={() => send({ type: 'reload' })}>{_(messages.reloadDueDecks)}</Action>
  </YStack>;
}
