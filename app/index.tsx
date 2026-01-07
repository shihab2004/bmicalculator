import { Ionicons,FontAwesome5  } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  clamp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type BmiCategory = {
  label: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  rangeLabel: string;
  hint: string;
  colorClass: string;
};

function parseNumber(input: string): number | null {
  const normalized = input.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) {
    return {
      label: 'Underweight',
      rangeLabel: '< 18.5',
      hint: 'Try a nutrient-dense diet and strength training. If unsure, check with a clinician.',
      colorClass: 'text-sky-300',
    };
  }

  if (bmi < 25) {
    return {
      label: 'Normal',
      rangeLabel: '18.5 – 24.9',
      hint: 'Nice! Keep a balanced diet and regular activity to maintain.',
      colorClass: 'text-emerald-300',
    };
  }

  if (bmi < 30) {
    return {
      label: 'Overweight',
      rangeLabel: '25.0 – 29.9',
      hint: 'Consider small, sustainable changes: daily steps, protein-forward meals, and sleep.',
      colorClass: 'text-amber-300',
    };
  }

  return {
    label: 'Obese',
    rangeLabel: '≥ 30.0',
    hint: 'A structured plan helps: nutrition, movement, and medical guidance if needed.',
    colorClass: 'text-rose-300',
  };
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

export default function Page() {
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  const reveal = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const heightValue = useMemo(() => parseNumber(heightCm), [heightCm]);
  const weightValue = useMemo(() => parseNumber(weightKg), [weightKg]);

  const category = useMemo(() => (bmi == null ? null : getBmiCategory(bmi)), [bmi]);

  const bmiColor = useDerivedValue(() => {
    const v = bmi ?? 0;
    if (v === 0) return 0;
    if (v < 18.5) return 0;
    if (v < 25) return 1;
    if (v < 30) return 2;
    return 3;
  }, [bmi]);

  const bgOrbsStyle = useAnimatedStyle(() => {
    const s = interpolate(pulse.value, [0, 1], [0.96, 1.04], Extrapolation.CLAMP);
    return { transform: [{ scale: s }] };
  });

  const shakeStyle = useAnimatedStyle(() => {
    return { transform: [{ translateX: shakeX.value }] };
  });

  const resultCardStyle = useAnimatedStyle(() => {
    const y = interpolate(reveal.value, [0, 1], [18, 0], Extrapolation.CLAMP);
    const opacity = reveal.value;
    return {
      opacity,
      transform: [{ translateY: y }],
    };
  });

  const barFillStyle = useAnimatedStyle(() => {
    const width = barWidth * progress.value;
    const c = interpolateColor(
      bmiColor.value,
      [0, 1, 2, 3],
      ['#38bdf8', '#34d399', '#fbbf24', '#fb7185'],
    );
    return {
      width,
      backgroundColor: c,
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    const x = clamp(barWidth * progress.value - 8, 0, Math.max(0, barWidth - 16));
    const c = interpolateColor(
      bmiColor.value,
      [0, 1, 2, 3],
      ['#38bdf8', '#34d399', '#fbbf24', '#fb7185'],
    );
    return {
      transform: [{ translateX: x }],
      backgroundColor: c,
    };
  });

  function triggerInvalidShake() {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }

  function onCalculate() {
    const h = heightValue;
    const w = weightValue;

    const valid =
      h != null &&
      w != null &&
      h > 40 &&
      h < 260 &&
      w > 10 &&
      w < 400;

    if (!valid) {
      triggerInvalidShake();
      reveal.value = withTiming(0, { duration: 180 });
      setBmi(null);
      progress.value = withTiming(0, { duration: 180 });
      return;
    }

    const heightM = h / 100;
    const nextBmi = w / (heightM * heightM);
    setBmi(nextBmi);

    reveal.value = withSpring(1, { damping: 14, stiffness: 140 });

    const normalized = Math.max(0, Math.min(1, (nextBmi - 10) / 30));
    progress.value = withTiming(normalized, { duration: 500, easing: Easing.out(Easing.cubic) });
  }

  function onReset() {
    setHeightCm('');
    setWeightKg('');
    setBmi(null);
    reveal.value = withTiming(0, { duration: 200 });
    progress.value = withTiming(0, { duration: 200 });
  }

  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar style="light" />

      <Animated.View
        pointerEvents="none"
        className="absolute inset-0"
        style={bgOrbsStyle}
      >
        <View className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-500/20" />
        <View className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/15" />
        <View className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-emerald-500/10" />
      </Animated.View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pt-14 pb-10"
        >
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-sm text-slate-300">BMI Calculator</Text>
              <Text className="text-3xl font-semibold text-white">Know your number</Text>
            </View>

            <Pressable
              onPress={onReset}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10"
              accessibilityRole="button"
              accessibilityLabel="Reset"
            >
              <Ionicons name="refresh" size={20} color="white" />
            </Pressable>
          </View>

          <Animated.View className="mt-7" style={shakeStyle}>
            <View className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <Text className="text-base font-semibold text-white">Enter your details</Text>
              <Text className="mt-1 text-sm text-slate-300">
                Metric units (cm, kg). Reasonable ranges only.
              </Text>

              <View className="mt-5 gap-4">
                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider text-slate-300">Height</Text>
                  <View className="flex-row items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Ionicons name="resize" size={18} color="#cbd5e1" />
                    <TextInput
                      value={heightCm}
                      onChangeText={setHeightCm}
                      placeholder="e.g. 172"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      className="ml-3 flex-1 text-base text-white"
                      returnKeyType="next"
                    />
                    <Text className="text-sm text-slate-300">cm</Text>
                  </View>
                </View>

                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider text-slate-300">Weight</Text>
                  <View className="flex-row items-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Ionicons name="barbell" size={18} color="#cbd5e1" />
                    <TextInput
                      value={weightKg}
                      onChangeText={setWeightKg}
                      placeholder="e.g. 68"
                      placeholderTextColor="#64748b"
                      keyboardType="decimal-pad"
                      className="ml-3 flex-1 text-base text-white"
                      returnKeyType="done"
                      onSubmitEditing={onCalculate}
                    />
                    <Text className="text-sm text-slate-300">kg</Text>
                  </View>
                </View>

                <Pressable
                  onPress={onCalculate}
                  className="mt-1 rounded-2xl bg-white px-5 py-4"
                  accessibilityRole="button"
                  accessibilityLabel="Calculate BMI"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <FontAwesome5  name="calculator" size={18} color="#0f172a" />
                    <Text className="text-base font-semibold text-slate-900">Calculate</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5"
            style={resultCardStyle}
          >
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <Text className="text-sm text-slate-300">Your BMI</Text>
                <Text className="text-4xl font-semibold text-white">
                  {bmi == null ? '—' : round1(bmi)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-sm text-slate-300">Category</Text>
                <Text className={`text-base font-semibold ${category?.colorClass ?? 'text-slate-200'}`}>
                  {category?.label ?? '—'}
                </Text>
                <Text className="mt-1 text-xs text-slate-400">{category?.rangeLabel ?? ''}</Text>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm text-slate-300">Range</Text>
              <View
                className="relative h-3 w-full overflow-hidden rounded-full bg-white/10"
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View className="h-3 rounded-full" style={barFillStyle} />
                <Animated.View
                  className="absolute top-1/2 h-4 w-4 -translate-y-2 rounded-full"
                  style={indicatorStyle}
                />
              </View>

              <View className="mt-3 flex-row justify-between">
                <Text className="text-xs text-slate-400">10</Text>
                <Text className="text-xs text-slate-400">18.5</Text>
                <Text className="text-xs text-slate-400">25</Text>
                <Text className="text-xs text-slate-400">30</Text>
                <Text className="text-xs text-slate-400">40+</Text>
              </View>
            </View>

            <Text className="mt-5 text-sm leading-5 text-slate-200">
              {bmi == null
                ? 'Enter your height and weight, then tap Calculate.'
                : category?.hint ?? ''}
            </Text>
          </Animated.View>

          <View className="mt-6">
            <Text className="text-xs text-slate-400">
              BMI is a screening metric and doesn’t directly measure body fat. Consider age, muscle mass,
              and health context.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}