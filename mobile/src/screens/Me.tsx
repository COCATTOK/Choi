// 나: 되고 싶은 나, 알림, 습관 관리, 데이터
import { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DOW } from '../lib/dates';
import { activeHabits, blank, catOf, timeOf } from '../lib/model';
import { askPermission } from '../notify';
import { useStore } from '../store/Store';
import { Chips, Icon, Sep, Sw, Tap } from '../ui/kit';
import { Screen } from '../ui/shell';
import { C, S as T } from '../ui/theme';

// 웹(react-native-web)에서는 켜진 스위치 손잡이 색을 따로 받습니다
const webThumb = (Platform.OS === 'web' ? { activeThumbColor: '#000' } : {}) as object;
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const REMIND_TIMES = [7 * 60, 8 * 60 + 30, 12 * 60, 19 * 60].map((m) => ({ id: String(m), name: hm(m) }));
const NUDGE_TIMES = [20 * 60, 21 * 60, 22 * 60].map((m) => ({ id: String(m), name: hm(m) }));

export default function Me() {
  const { S, update, replace, openSheet, toast } = useStore();
  const set = (k: 'remind' | 'nudge', v: boolean) => {
    if (v) askPermission().then((ok) => !ok && Platform.OS !== 'web' && toast('설정에서 알림을 허용해주세요'));
    update((x) => { x.settings[k] = v; }, { quiet: true });
  };
  const exportData = async () => {
    try {
      await Share.share({ message: JSON.stringify(S), title: '점과 선 백업' });
    } catch {
      toast('내보내지 못했습니다');
    }
  };
  const reset = () => {
    const go = () => replace(blank());
    if (Platform.OS === 'web') return (globalThis as { confirm?: (m: string) => boolean }).confirm?.('모든 기록을 지울까요? 되돌릴 수 없습니다.') && go();
    Alert.alert('모든 기록을 지울까요?', '되돌릴 수 없습니다.', [{ text: '취소', style: 'cancel' }, { text: '지우기', style: 'destructive', onPress: go }]);
  };
  return (
    <Screen eyebrow="나" title={S.profile.name || '나'}>
      <Text style={T.section}>되고 싶은 나</Text>
      <Profile key={`${S.profile.name}|${S.profile.identity}`} />
      <Text style={[T.sectionDesc, { marginTop: 10 }]}>습관을 체크할 때마다 이 모습에 한 표를 던집니다.</Text>

      <Text style={T.section}>알림</Text>
      <View style={T.group}>
        <View style={st.frow}>
          <View style={{ flex: 1 }}><Text style={T.body}>매일 리마인더</Text><Text style={st.sub}>정해진 시각에 오늘의 점을 떠올리게</Text></View>
          <Switch value={S.settings.remind} onValueChange={(v) => set('remind', v)} trackColor={{ true: C.text, false: C.surface2 }} thumbColor={S.settings.remind ? '#000' : C.text2} {...webThumb} />
        </View>
        {S.settings.remind ? <View style={st.pad}><Chips items={REMIND_TIMES} value={String(S.settings.remindAt)} onChange={(v) => update((x) => { x.settings.remindAt = +v; }, { quiet: true })} /></View> : null}
        <View style={st.frow}>
          <Sep />
          <View style={{ flex: 1 }}><Text style={T.body}>저녁 알림</Text><Text style={st.sub}>남은 습관이 있을 때만 · 연속 기록이 끊기기 전에</Text></View>
          <Switch value={S.settings.nudge} onValueChange={(v) => set('nudge', v)} trackColor={{ true: C.text, false: C.surface2 }} thumbColor={S.settings.nudge ? '#000' : C.text2} {...webThumb} />
        </View>
        {S.settings.nudge ? <View style={st.pad}><Chips items={NUDGE_TIMES} value={String(S.settings.nudgeAt)} onChange={(v) => update((x) => { x.settings.nudgeAt = +v; }, { quiet: true })} /></View> : null}
      </View>
      <Text style={[T.sectionDesc, { marginTop: 10 }]}>홈 화면 앱 아이콘에는 오늘 남은 습관 수가 표시됩니다.</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={T.section}>습관</Text>
        <Tap onPress={() => openSheet({ kind: 'habit' })}><Text style={{ color: C.text2, fontSize: 13 }}>추가</Text></Tap>
      </View>
      <View style={T.group}>
        {!activeHabits(S).length && <View style={T.row}><Text style={T.meta}>아직 습관이 없습니다.</Text></View>}
        {activeHabits(S).map((h, i) => (
          <Tap key={h.id} scale={0.985} style={T.row} onPress={() => openSheet({ kind: 'habit', id: h.id })}>
            {i > 0 && <Sep />}
            <Sw color={catOf(h.cat).color} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={T.body}>{h.name}</Text>
              <Text style={st.sub}>{timeOf(h.time).name} · {h.days.length === 7 ? '매일' : h.days.map((d) => DOW[d]).join(' ')}</Text>
            </View>
            <Icon name="chev" size={14} color={C.muted} />
          </Tap>
        ))}
      </View>

      <Text style={T.section}>데이터</Text>
      <View style={T.group}>
        <Tap scale={0.985} style={T.row} onPress={exportData}><Text style={T.body}>백업 내보내기</Text></Tap>
        <Tap scale={0.985} style={T.row} onPress={() => openSheet({ kind: 'import' })}><Sep /><Text style={T.body}>백업 불러오기 · 웹 버전에서 옮기기</Text></Tap>
        <Tap scale={0.985} style={T.row} onPress={reset}><Sep /><Text style={[T.body, { color: C.danger }]}>모든 기록 지우기</Text></Tap>
      </View>
      <Text style={[T.sectionDesc, { marginTop: 10 }]}>기록은 이 기기에만 저장됩니다.</Text>
      <Text style={st.sig}>“Stay hungry. Stay foolish.”</Text>
    </Screen>
  );
}

function Profile() {
  const { S, update, toast } = useStore();
  const [name, setName] = useState(S.profile.name);
  const [identity, setIdentity] = useState(S.profile.identity);
  return (
      <View style={T.group}>
      <View style={st.frow}><Text style={st.flabel}>이름</Text><TextInput value={name} onChangeText={setName} placeholder="이름" placeholderTextColor={C.muted} maxLength={12} style={st.finput} /></View>
      <View style={st.frow}><Sep /><Text style={st.flabel}>나는</Text><TextInput value={identity} onChangeText={setIdentity} placeholder="매일 성장하는" placeholderTextColor={C.muted} maxLength={20} style={st.finput} /><Text style={{ color: C.text2 }}>사람</Text></View>
      <Tap style={[st.frow, { justifyContent: 'center' }]} onPress={() => { update((x) => { x.profile.name = name.trim(); x.profile.identity = identity.trim(); }, { quiet: true }); toast('저장했습니다'); }}>
        <Sep /><Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>저장</Text>
      </Tap>
    </View>
  );
}

const st = StyleSheet.create({
  frow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 8 },
  flabel: { width: 44, color: C.text2, fontSize: 15 },
  finput: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 8 },
  sub: { color: C.muted, fontSize: 12, marginTop: 2 },
  pad: { paddingHorizontal: 16, paddingBottom: 14 },
  sig: { color: C.muted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
});
