import { linkBank } from '../linkBank';
import { requestChosenNotifications } from '../permissions';

it('cancels a mock link when navigating back', async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const link = linkBank('Chase', controller.signal);
  const rejected = expect(link).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await rejected;
  jest.runAllTimers();
  jest.useRealTimers();
});
it('finishes linking only after the specified delay', async () => {
  jest.useFakeTimers();
  let linked = false;
  const promise = linkBank('Chase').then(() => { linked = true; });
  await jest.advanceTimersByTimeAsync(1799);
  expect(linked).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await promise;
  expect(linked).toBe(true);
  jest.useRealTimers();
});
it('skips permission prompts when every preference is off and tolerates denial/errors', async () => {
  const request = jest.fn(async () => { throw new Error('denied'); });
  await requestChosenNotifications({ bills: false, unusual: false, goals: false, recap: false }, request);
  expect(request).not.toHaveBeenCalled();
  await expect(requestChosenNotifications({ bills: true, unusual: false, goals: false, recap: false }, request)).resolves.toBeUndefined();
  expect(request).toHaveBeenCalledTimes(1);
});
