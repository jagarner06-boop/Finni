import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { FinnRefresh } from '../FinnRefresh';
it('refreshes once at threshold, shows the result, and recovers from errors', async () => {
  const refresh = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));
  await render(<FinnRefresh onRefresh={refresh}><Text>Content</Text></FinnRefresh>);
  expect(screen.getByTestId('refresh-ticks')).toBeTruthy();
  const pull = async () => act(async () => {
    fireGestureHandler(getByGestureTestId('finn-refresh-gesture'), [
      { state: State.BEGAN, translationY: 0 }, { state: State.ACTIVE, translationY: 0 }, { state: State.ACTIVE, translationY: 140 }, { state: State.END, translationY: 140 },
    ]);
  });
  await pull();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Updated just now')).toBeTruthy();
  await pull();
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(await screen.findByText('Could not refresh. Pull to try again.')).toBeTruthy();
});
