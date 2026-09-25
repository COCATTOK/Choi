// 첫 실행: 잡스의 문장 → 되고 싶은 나 → 첫 습관 (→ 알림 허용)
import { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { today, uid } from '../lib/dates';
import { IDENTITIES, TEMPLATES, catOf, timeOf } from '../lib/model';
import { sampleState } from '../lib/sample';
import { askPermission } from '../notify';
import { useAct } from '../store/Store';
import { success, tick } from '../ui/feel';
import { Icon, Sep, Tap } from '../ui/kit';
import { C, PAD, S as T } from '../ui/theme';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);

export default function Onboarding() {
  const { update, replace, toast } = useAct();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set([0, 2, 3]));
  const fade = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, fade]);

  const finish = async () => {
    update((x) => {
      x.profile = { name: name.trim(), identity: identity.trim(), onboarded: true };
      for (const i of picked) x.habits.push({ id: uid(), start: today(), days: [0, 1, 2, 3, 4, 5, 6], ...TEMPLATES[i] });
    }, { quiet: true });
    success();
    await askPermission(); // 다시 돌아오게 하는 가장 강력한 장치
    toast('첫 번째 점을 찍어보세요');
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        {step === 0 && (
          <View style={[st.fill, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, justifyContent: 'center' }]}>
            <DotsArt />
            <Text style={st.quote}>{'앞을 내다보며\n점을 이을 수는 없습니다.\n오직 뒤를 돌아볼 때만\n이을 수 있죠.'}</Text>
            <Text style={st.cite}>Steve Jobs, Stanford, 2005</Text>
            <View style={{ marginTop: 64, gap: 6 }}>
              <Tap haptic style={st.primary} onPress={() => setStep(1)}><Text style={st.primaryText}>시작하기</Text></Tap>
              <Tap style={{ padding: 12, alignItems: 'center' }} onPress={() => { replace(sampleState()); toast('예시 기록'); }}>
                <Text style={{ color: C.text2, fontSize: 15 }}>예시로 둘러보기</Text>
              </Tap>
            </View>
          </View>
        )}
        {step === 1 && (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[st.fill, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
            <Text style={st.num}>1 / 2</Text>
            <Text style={st.h2}>{'어떤 사람이\n되고 싶나요?'}</Text>
            <Text style={st.desc}>습관은 되고 싶은 나에게 던지는 한 표입니다.</Text>
            <View style={T.group}>
              <View style={st.frow}><Text style={st.flabel}>이름</Text><TextInput value={name} onChangeText={setName} placeholder="이름" placeholderTextColor={C.muted} maxLength={12} style={st.finput} /></View>
              <View style={st.frow}><Sep /><Text style={st.flabel}>나는</Text><TextInput value={identity} onChangeText={setIdentity} placeholder="매일 성장하는" placeholderTextColor={C.muted} maxLength={20} style={st.finput} /><Text style={{ color: C.text2 }}>사람</Text></View>
            </View>
            <View style={st.chips}>
              {IDENTITIES.map((idn) => (
                <Tap key={idn} haptic onPress={() => setIdentity(idn)} style={[st.chip, identity === idn && { backgroundColor: C.text }]}>
                  <Text style={{ color: identity === idn ? '#000' : C.text2, fontSize: 13 }}>{idn}</Text>
                </Tap>
              ))}
            </View>
            <View style={{ flex: 1, minHeight: 40 }} />
            <Tap haptic style={st.primary} onPress={() => setStep(2)}><Text style={st.primaryText}>다음</Text></Tap>
          </ScrollView>
        )}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: PAD + 4, paddingTop: insets.top + 32, paddingBottom: 120 }}>
              <Text style={st.num}>2 / 2</Text>
              <Text style={st.h2}>작게 시작하세요.</Text>
              <Text style={st.desc}>두세 개면 충분합니다.</Text>
              <View style={T.group}>
                {TEMPLATES.map((t, i) => {
                  const on = picked.has(i);
                  return (
                    <Tap key={t.name} scale={0.985} style={st.tpl} onPress={() => { tick(); const n = new Set(picked); if (on) n.delete(i); else n.add(i); setPicked(n); }}>
                      {i > 0 && <Sep />}
                      <View style={[st.tick, on && { backgroundColor: C.text, borderColor: C.text }]}>{on ? <Icon name="check" size={13} color="#000" width={2.6} /> : null}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.body}>{t.name}</Text>
                        <Text style={{ color: C.muted, fontSize: 12 }}>{timeOf(t.time).name} · {catOf(t.cat).name}</Text>
                      </View>
                    </Tap>
                  );
                })}
              </View>
            </ScrollView>
            <View style={[st.sticky, { paddingBottom: insets.bottom + 16 }]}>
              <Tap haptic style={st.primary} onPress={finish}><Text style={st.primaryText}>시작</Text></Tap>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// 점이 하나씩 나타나고 선으로 이어지는 그림
function DotsArt() {
  const pts = [[20, 70], [85, 38], [150, 56], [220, 16]];
  const dots = useState(() => pts.map(() => new Animated.Value(0)))[0];
  const line = useState(() => new Animated.Value(300))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.stagger(400, dots.map((d) => Animated.timing(d, { toValue: 1, duration: 500, useNativeDriver: false }))),
      Animated.timing(line, { toValue: 0, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [dots, line]);
  return (
    <View style={{ alignItems: 'center', marginBottom: 48 }}>
      <Svg width={260} height={96} viewBox="0 0 240 90">
        <APath d="M20 70 L85 38 L150 56 L220 16" stroke={C.text} strokeOpacity={0.5} strokeWidth={1} fill="none" strokeDasharray="300" strokeDashoffset={line} />
        {pts.map(([x, y], i) => <ACircle key={i} cx={x} cy={y} r={i === 3 ? 4.5 : 3.5} fill={C.text} opacity={dots[i]} />)}
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flexGrow: 1, paddingHorizontal: PAD + 4 },
  quote: { color: C.text, fontSize: 20, fontWeight: '300', lineHeight: 32, textAlign: 'center', letterSpacing: -0.4 },
  cite: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 18, letterSpacing: 0.5 },
  primary: { backgroundColor: C.text, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#000', fontSize: 16, fontWeight: '600' },
  num: { color: C.muted, fontSize: 13, marginBottom: 14 },
  h2: { color: C.text, fontSize: 32, fontWeight: '700', letterSpacing: -1.1, lineHeight: 40 },
  desc: { color: C.text2, fontSize: 15, marginTop: 12, marginBottom: 28 },
  frow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16 },
  flabel: { width: 44, color: C.text2, fontSize: 15 },
  finput: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface2 },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.hair2, alignItems: 'center', justifyContent: 'center' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAD + 4, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.92)' },
});
