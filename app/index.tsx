import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

type BmiCategory = {
  label: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  rangeLabel: string;
  hint: string;
  colorClass: string;
  accentHex: string;
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
      colorClass: 'text-orange-700',
      accentHex: '#c2410c',
    };
  }

  if (bmi < 25) {
    return {
      label: 'Normal',
      rangeLabel: '18.5 – 24.9',
      hint: 'Nice! Keep a balanced diet and regular activity to maintain.',
      colorClass: 'text-emerald-700',
      accentHex: '#047857',
    };
  }

  if (bmi < 30) {
    return {
      label: 'Overweight',
      rangeLabel: '25.0 – 29.9',
      hint: 'Consider small, sustainable changes: daily steps, protein-forward meals, and sleep.',
      colorClass: 'text-amber-700',
      accentHex: '#b45309',
    };
  }

  return {
    label: 'Obese',
    rangeLabel: '≥ 30.0',
    hint: 'A structured plan helps: nutrition, movement, and medical guidance if needed.',
    colorClass: 'text-rose-700',
    accentHex: '#be123c',
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

  const reveal = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const indicatorPop = useRef(new Animated.Value(0)).current;

  const heightValue = useMemo(() => parseNumber(heightCm), [heightCm]);
  const weightValue = useMemo(() => parseNumber(weightKg), [weightKg]);

  const category = useMemo(() => (bmi == null ? null : getBmiCategory(bmi)), [bmi]);
  const accentHex = category?.accentHex ?? '#0f172a';

  const resultCardStyle = useMemo(
    () => ({
      opacity: reveal,
      transform: [
        {
          translateY: reveal.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          }),
        },
      ],
    }),
    [reveal],
  );

  const shakeStyle = useMemo(
    () => ({
      transform: [{ translateX: shakeX }],
    }),
    [shakeX],
  );

  const barFillStyle = useMemo(
    () => ({
      width: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, barWidth],
      }),
      backgroundColor: accentHex,
    }),
    [progress, barWidth, accentHex],
  );

  const indicatorStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.max(0, barWidth - 16)],
          }),
        },
        {
          translateY: indicatorPop.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, -14],
          }),
        },
        {
          scale: indicatorPop.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.35],
          }),
        },
      ],
      backgroundColor: accentHex,
      opacity: bmi == null ? 0 : 1,
    }),
    [progress, barWidth, accentHex, indicatorPop, bmi],
  );

  function triggerIndicatorPop() {
    indicatorPop.stopAnimation();
    indicatorPop.setValue(0);
    Animated.sequence([
      Animated.spring(indicatorPop, {
        toValue: 1,
        speed: 18,
        bounciness: 10,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorPop, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function triggerInvalidShake() {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
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
      setBmi(null);
      indicatorPop.setValue(0);
      Animated.parallel([
        Animated.timing(reveal, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start();
      return;
    }

    const heightM = h / 100;
    const nextBmi = w / (heightM * heightM);
    setBmi(nextBmi);

    Animated.timing(reveal, { toValue: 1, duration: 220, useNativeDriver: true }).start();

    const normalized = Math.max(0, Math.min(1, (nextBmi - 10) / 30));
    Animated.timing(progress, {
      toValue: normalized,
      duration: 480,
      useNativeDriver: false,
    }).start();

    triggerIndicatorPop();
  }

  function onReset() {
    setHeightCm('');
    setWeightKg('');
    setBmi(null);
    indicatorPop.setValue(0);
    Animated.parallel([
      Animated.timing(reveal, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start();
  }

  return (
    <View className="flex-1 bg-stone-100">
      <StatusBar style="dark" />

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
              <Text className="text-sm text-stone-600">BMI Calculator</Text>
              <Text className="text-3xl font-semibold text-stone-900">Know your number</Text>
              <Text className="mt-1 text-sm text-stone-600">A quick, simple check-in.</Text>
            </View>

            <Pressable
              onPress={onReset}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-white border border-stone-200"
              accessibilityRole="button"
              accessibilityLabel="Reset"
            >
              <Ionicons name="refresh" size={20} color="#0f172a" />
            </Pressable>
          </View>

          <Animated.View className="mt-7" style={shakeStyle}>
            <View className="rounded-3xl border border-stone-200 bg-white p-5">
              <Text className="text-base font-semibold text-stone-900">Enter your details</Text>
              <Text className="mt-1 text-sm text-stone-600">
                Metric units (cm, kg). Reasonable ranges only.
              </Text>

              <View className="mt-5 gap-4">
                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider text-stone-600">Height</Text>
                  <View className="flex-row items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <Ionicons name="resize" size={18} color="#334155" />
                    <TextInput
                      value={heightCm}
                      onChangeText={setHeightCm}
                      placeholder="e.g. 172"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      className="ml-3 flex-1 text-base text-stone-900"
                      returnKeyType="next"
                    />
                    <Text className="text-sm text-stone-600">cm</Text>
                  </View>
                </View>

                <View className="gap-2">
                  <Text className="text-xs uppercase tracking-wider text-stone-600">Weight</Text>
                  <View className="flex-row items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <Ionicons name="barbell" size={18} color="#334155" />
                    <TextInput
                      value={weightKg}
                      onChangeText={setWeightKg}
                      placeholder="e.g. 68"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      className="ml-3 flex-1 text-base text-stone-900"
                      returnKeyType="done"
                      onSubmitEditing={onCalculate}
                    />
                    <Text className="text-sm text-stone-600">kg</Text>
                  </View>
                </View>

                <Pressable
                  onPress={onCalculate}
                  className="mt-1 rounded-2xl bg-emerald-600 px-5 py-4"
                  accessibilityRole="button"
                  accessibilityLabel="Calculate BMI"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <FontAwesome5 name="calculator" size={18} color="#ffffff" />
                    <Text className="text-base font-semibold text-white">Calculate</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white p-5"
            style={resultCardStyle}
          >
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <Text className="text-sm text-stone-600">Your BMI</Text>
                <Text className="text-4xl font-semibold text-stone-900">
                  {bmi == null ? '—' : round1(bmi)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-sm text-stone-600">Category</Text>
                <Text className={`text-base font-semibold ${category?.colorClass ?? 'text-stone-700'}`}>
                  {category?.label ?? '—'}
                </Text>
                <Text className="mt-1 text-xs text-stone-500">{category?.rangeLabel ?? ''}</Text>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm text-stone-600">Range</Text>
              <View
                className="relative h-3 w-full overflow-hidden rounded-full bg-stone-200"
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View className="h-3 rounded-full" style={barFillStyle} />
                <Animated.View
                  className="absolute top-1/2 h-4 w-4 rounded-full"
                  style={indicatorStyle}
                />
              </View>

              <View className="mt-3 flex-row justify-between">
                <Text className="text-xs text-stone-500">10</Text>
                <Text className="text-xs text-stone-500">18.5</Text>
                <Text className="text-xs text-stone-500">25</Text>
                <Text className="text-xs text-stone-500">30</Text>
                <Text className="text-xs text-stone-500">40+</Text>
              </View>
            </View>

            <Text className="mt-5 text-sm leading-5 text-stone-700">
              {bmi == null
                ? 'Enter your height and weight, then tap Calculate.'
                : category?.hint ?? ''}
            </Text>
          </Animated.View>

          <View className="mt-6">
            <Text className="text-xs text-stone-500">
              BMI is a screening metric and doesn’t directly measure body fat. Consider age, muscle mass,
              and health context.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}