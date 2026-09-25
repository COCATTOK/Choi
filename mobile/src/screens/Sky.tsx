import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATS, edges } from '../lib/model';
import { useAct, useJustAdded, useS } from '../store/Store';
import { Constellation } from '../ui/charts';
import { Icon, Sw, Tap } from '../ui/kit';
import { Screen } from '../ui/shell';
import { C } from '../ui/theme';

export default function Sky() {
  const S = useS();
  const justAdded = useJustAdded();
  const { openSheet, setJustAdded } = useAct();
  const used = new Set(S.dots.map((d) => d.cat));
  // 새로 이은 선은 잠깐 밝게 보여주고 제자리로
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(null), 2500);
    return () => clearTimeout(t);
  }, [justAdded, setJustAdded]);
  return (
    <Screen
      eyebrow={S.dots.length ? `${S.dots.length}개의 점 · ${edges(S).length}개의 선` : undefined}
      title="별자리"
      right={<Tap haptic style={st.iconBtn} onPress={() => openSheet({ kind: 'dot' })} accessibilityLabel="오늘의 점 찍기"><Icon name="plus" size={18} /></Tap>}
    >
      <Constellation S={S} fresh={justAdded} onPick={(id) => openSheet({ kind: 'dotDetail', id })} />
      <View style={st.legend}>
        {CATS.filter((c) => !S.dots.length || used.has(c.id)).map((c) => (
          <View key={c.id} style={st.lg}><Sw color={c.color} /><Text style={st.lgText}>{c.name}</Text></View>
        ))}
      </View>
      <Text style={st.foot}>뒤돌아볼 때만 점을 이을 수 있다.</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, rowGap: 6, paddingVertical: 8 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgText: { color: C.muted, fontSize: 12 },
  foot: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 20 },
});
