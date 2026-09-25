// 앱을 열지 않아도 다시 돌아오게 하는 로컬 알림.
// 서버 없이 기기 안에서 예약합니다. 앱을 열거나 기록할 때마다 다시 맞춥니다.
//  · 매일 리마인더 (설정한 시각, 반복)
//  · 저녁 넛지: 오늘 남은 습관이 있으면 "안 하면 지수 -x" (오늘 하루만)
//  · 연속 기록 위험: 내일·모레 저녁, 연속 기록이 끊기기 전에
//  · 복귀: 3일 동안 열지 않으면 한 번
//  · 앱 아이콘 배지: 오늘 남은 습관 수
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { shift, today } from './lib/dates';
import { dayProgress, fmtIdx, forecast, habitsFor, streak, type State } from './lib/model';

const native = Platform.OS !== 'web';
const IDS = ['remind-daily', 'nudge-today', 'risk-1', 'risk-2', 'comeback'];

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
  });
}

export async function askPermission() {
  if (!native) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', {
        name: '매일 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

const at = (day: string, minutes: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
};

export async function syncNotifications(S: State) {
  if (!native || !S.profile.onboarded) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const p = dayProgress(S, today());
    const left = p.total - p.done;
    await Notifications.setBadgeCountAsync(Math.max(0, left)).catch(() => {});
    if (!perm.granted) return;
    await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));

    const { remind, remindAt, nudge, nudgeAt } = S.settings;
    const who = S.profile.identity ? `${S.profile.identity} 사람` : '되고 싶은 나';
    const now = Date.now();
    const channelId = 'daily';

    if (remind) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'remind-daily',
        content: { title: '오늘의 점을 찍을 시간', body: `${who}에게 오늘도 한 표를 던져볼까요?` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: Math.floor(remindAt / 60), minute: remindAt % 60, channelId },
      });
    }
    if (nudge) {
      const tonight = at(today(), nudgeAt);
      if (left > 0 && tonight.getTime() > now) {
        const f = forecast(S);
        await Notifications.scheduleNotificationAsync({
          identifier: 'nudge-today',
          content: {
            title: `남은 습관 ${left}개`,
            body: f.dir === 'down' ? `오늘 기록이 없으면 지수가 ${fmtIdx(f.drop)} 내려갑니다.` : `지금 하면 지수가 +${left * 3} 더 오릅니다.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tonight, channelId },
        });
      }
      // 내일·모레: 그때까지 앱을 열지 않으면 연속 기록이 위험해요
      const st = streak(S);
      for (const k of [1, 2]) {
        const day = shift(today(), k);
        if (!habitsFor(S, day).length && !st) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `risk-${k}`,
          content: st
            ? { title: `${st}일 연속 기록`, body: '오늘 하나만 해도 선이 이어집니다.' }
            : { title: '오늘의 점', body: '작은 습관 하나가 첫 번째 점이 됩니다.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at(day, nudgeAt), channelId },
        });
      }
    }
    // 3일 동안 열지 않으면 (열 때마다 뒤로 밀림)
    await Notifications.scheduleNotificationAsync({
      identifier: 'comeback',
      content: { title: '끊긴 선은 다시 이을 수 있습니다', body: '가장 쉬운 습관 하나로 다시 시작해볼까요?' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at(shift(today(), 3), remindAt), channelId },
    });
  } catch {
    // 알림은 부가 기능 — 실패해도 앱은 계속 동작합니다
  }
}
