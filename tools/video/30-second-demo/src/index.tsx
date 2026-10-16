import React, { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AnimatedEmoji } from '@remotion/animated-emoji';
import { glow } from '@remotion/effects/glow';
import { noise as effectNoise } from '@remotion/effects/noise';
import { shine } from '@remotion/effects/shine';
import { vignette } from '@remotion/effects/vignette';
import { loadFont as loadInterFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadRobotoMonoFont } from '@remotion/google-fonts/RobotoMono';
import { Lottie } from '@remotion/lottie';
import type { LottieAnimationData } from '@remotion/lottie';
import { Trail } from '@remotion/motion-blur';
import { noise2D } from '@remotion/noise';
import { Arrow, Star } from '@remotion/shapes';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import {
  AbsoluteFill,
  cancelRender,
  Composition,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  registerRoot,
  Solid,
  staticFile,
  useCurrentFrame,
} from 'remotion';
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 60;
const TRANSITION_FRAMES = 18;
const SCENE_DURATIONS = [240, 554, 487, 270] as const;
// TransitionSeries overlaps adjacent scenes, so transition frames shorten the visible timeline.
const DURATION_IN_FRAMES =
  SCENE_DURATIONS.reduce((total, duration) => total + duration, 0) -
  TRANSITION_FRAMES * (SCENE_DURATIONS.length - 1);
const colors = {
  background: '#f6f8f6',
  border: '#d9e0dd',
  blue: '#2563eb',
  blueDark: '#1e3a8a',
  charcoal: '#17211f',
  green: '#12805c',
  greenDark: '#0f513d',
  muted: '#68756f',
  orange: '#d97706',
  panel: '#ffffff',
  softBlue: '#dbeafe',
  softGreen: '#dff5eb',
  softOrange: '#ffedd5',
};
const loadInterFontOptions: Parameters<typeof loadInterFont>[1] = {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700', '800', '900'],
};
const { fontFamily: interFontFamily } = loadInterFont('normal', loadInterFontOptions);
const loadRobotoMonoFontOptions: Parameters<typeof loadRobotoMonoFont>[1] = {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700'],
};
const { fontFamily: robotoMonoFontFamily } = loadRobotoMonoFont('normal', loadRobotoMonoFontOptions);
const uiFontFamily = `${interFontFamily}, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
const codeFontFamily = `${robotoMonoFontFamily}, SFMono-Regular, Consolas, monospace`;
const researchPrompt = 'Compare USD/EUR rates from 3 sites.';
type Tone = 'blue' | 'green' | 'orange';
type NumberRange = readonly [number, number];
type HumanTypingConfig = {
  keyHold: NumberRange;
  mistypeChance: number;
  mistypeDelayCorrect: NumberRange;
  mistypeDelayNotice: NumberRange;
  shiftDownDelay: NumberRange;
  shiftUpDelay: NumberRange;
  typingDelay: number;
  typingDelaySpread: number;
  typingPauseChance: number;
  typingPauseRange: NumberRange;
};
type TypingStep = {
  frame: number;
  text: string;
};
type TraceActivity = {
  detail: string;
  label: 'Plan' | 'Result' | 'Tool';
  offset: number;
  tone?: Tone;
};
const humanTypingConfig = {
  keyHold: [10, 24],
  mistypeChance: 0.02,
  mistypeDelayCorrect: [45, 110],
  mistypeDelayNotice: [80, 190],
  shiftDownDelay: [18, 42],
  shiftUpDelay: [12, 30],
  typingDelay: 52,
  typingDelaySpread: 32,
  typingPauseChance: 0.09,
  typingPauseRange: [220, 520],
} satisfies HumanTypingConfig;
const nearbyKeys = {
  0: '9p',
  1: '2q',
  2: '13qw',
  3: '24we',
  4: '35er',
  5: '46rt',
  6: '57ty',
  7: '68yu',
  8: '79ui',
  9: '80io',
  a: 'sqwz',
  b: 'vghn',
  c: 'xdfv',
  d: 'sfecx',
  e: 'wrsdf',
  f: 'dgrtcv',
  g: 'fhtyb',
  h: 'gjybn',
  i: 'ujko',
  j: 'hkunm',
  k: 'jloi',
  l: 'kop',
  m: 'njk',
  n: 'bhjm',
  o: 'iklp',
  p: 'ol',
  q: 'wa',
  r: 'edft',
  s: 'awedxz',
  t: 'rfgy',
  u: 'yhji',
  v: 'cfgb',
  w: 'qase',
  x: 'zsdc',
  y: 'tghu',
  z: 'asx',
} satisfies Record<string, string>;
const values: Iterable<string> | null | undefined = [
  '@',
  '#',
  '!',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '_',
  '+',
  ':',
  '"',
  '<',
  '>',
  '?',
  '~',
];
const shiftSymbols = new Set(values);
const linearTimingOptions = { durationInFrames: TRANSITION_FRAMES } as const;
const transitionTiming = linearTiming(linearTimingOptions);
const sceneTransitions = {
  capabilitiesToCta: (
    <TransitionSeries.Transition
      presentation={(() => {
        const fadeOptions = { shouldFadeOutExitingScene: true } as const;
        return fade(fadeOptions);
      })()}
      timing={transitionTiming}
    />
  ),
  introToResearch: (
    <TransitionSeries.Transition
      presentation={(() => {
        const slideOptions = { direction: 'from-right' } as const;
        return slide(slideOptions);
      })()}
      timing={transitionTiming}
    />
  ),
  researchToCapabilities: (
    <TransitionSeries.Transition
      presentation={(() => {
        const wipeOptions = { direction: 'from-bottom-right' } as const;
        return wipe(wipeOptions);
      })()}
      timing={transitionTiming}
    />
  ),
};
const clamp = (value: number, input: [number, number], output: [number, number]): number => {
  const interpolateOptions = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;
  return interpolate(value, input, output, interpolateOptions);
};
const enterStyle = (frame: number, delay = 0): CSSProperties => {
  const values2: [number, number] = [delay, delay + 16];
  const values3: [number, number] = [0, 1];
  const clampResult = clamp(frame, values2, values3);
  const values4: [number, number] = [delay, delay + 20];
  const values5: [number, number] = [28, 0];
  const templateValue = clamp(frame, values4, values5);
  const message = `0 ${templateValue}px`;
  return {
    opacity: clampResult,
    translate: message,
  };
};
const scaleInStyle = (frame: number, delay = 0): CSSProperties => {
  const values6: [number, number] = [delay, delay + 14];
  const values7: [number, number] = [0, 1];
  const clampResult2 = clamp(frame, values6, values7);
  const values8: [number, number] = [delay, delay + 18];
  const values9: [number, number] = [0.96, 1];
  const clampResult3 = clamp(frame, values8, values9);
  return {
    opacity: clampResult2,
    scale: clampResult3,
  };
};
const cardStyle = (extra?: CSSProperties): CSSProperties => ({
  backgroundColor: colors.panel,
  border: `2px solid ${colors.border}`,
  borderRadius: 24,
  boxShadow: '0 22px 70px rgb(23 33 31 / 0.12)',
  ...extra,
});
const msToFrames = (ms: number): number => {
  const computedValue = (ms / 1000) * FPS;
  const roundResult = Math.round(computedValue);
  return Math.max(1, roundResult);
};
const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const randomRange = (random: () => number, range: NumberRange): number =>
  range[0] + random() * (range[1] - range[0]);
const isAscii = (character: string): boolean => {
  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && codePoint < 128;
};
const isUpperCase = (character: string): boolean =>
  character.length === 1 && character >= 'A' && character <= 'Z';
const isAlphaNumeric = (character: string): boolean => /^[a-zA-Z0-9]$/.test(character);
const getNearbyKey = (character: string, random: () => number): string => {
  const lower = character.toLowerCase();
  const neighbors = nearbyKeys[lower as keyof typeof nearbyKeys];
  if (!neighbors) return character;
  const receiver = neighbors;
  const computedValue2 = random() * neighbors.length;
  const wrong = receiver[Math.floor(computedValue2)] ?? character;
  return isUpperCase(character) ? wrong.toUpperCase() : wrong;
};
const keyActionDelay = (character: string, config: HumanTypingConfig, random: () => number): number => {
  if (!isAscii(character)) return randomRange(random, config.keyHold);
  if (isUpperCase(character) || shiftSymbols.has(character)) {
    return (
      randomRange(random, config.shiftDownDelay) +
      randomRange(random, config.keyHold) +
      randomRange(random, config.shiftUpDelay)
    );
  }
  return randomRange(random, config.keyHold);
};
const interCharacterDelay = (config: HumanTypingConfig, random: () => number): number => {
  if (random() < config.typingPauseChance) return randomRange(random, config.typingPauseRange);
  const delay = config.typingDelay + (random() - 0.5) * 2 * config.typingDelaySpread;
  return Math.max(10, delay);
};
const pushTypingStep = (steps: TypingStep[], elapsedMs: number, text: string): void => {
  const frame = msToFrames(elapsedMs);
  const lastStep = steps[steps.length - 1];
  if (lastStep?.frame === frame) {
    lastStep.text = text;
    return;
  }
  const pushOptions = { frame, text } as const;
  steps.push(pushOptions);
};
function createHumanizedTypingSteps(text: string, seed: number, config: HumanTypingConfig): TypingStep[] {
  const random = createSeededRandom(seed);
  const characters = [...text];
  const steps: TypingStep[] = [{ frame: 0, text: '' }];
  let elapsedMs = 0;
  let visibleText = '';
  for (const [index, character] of characters.entries()) {
    if (random() < config.mistypeChance && isAlphaNumeric(character)) {
      const wrongCharacter = getNearbyKey(character, random);
      elapsedMs += randomRange(random, config.keyHold);
      const message2 = `${visibleText}${wrongCharacter}`;
      pushTypingStep(steps, elapsedMs, message2);
      elapsedMs += randomRange(random, config.mistypeDelayNotice);
      pushTypingStep(steps, elapsedMs, visibleText);
      elapsedMs += randomRange(random, config.mistypeDelayCorrect);
    }
    elapsedMs += keyActionDelay(character, config, random);
    visibleText += character;
    pushTypingStep(steps, elapsedMs, visibleText);
    if (index < characters.length - 1) elapsedMs += interCharacterDelay(config, random);
  }
  return steps;
}
const researchTypingSteps = createHumanizedTypingSteps(researchPrompt, 1337, humanTypingConfig);
const traceActivities = [
  { detail: 'Pick FX sites', label: 'Plan', offset: 0 },
  { detail: 'browser_navigate', label: 'Tool', offset: 34, tone: 'blue' },
  { detail: 'Rates captured', label: 'Result', offset: 68, tone: 'orange' },
  { detail: 'Compare quotes', label: 'Plan', offset: 102 },
  { detail: 'browser_snapshot', label: 'Tool', offset: 136, tone: 'blue' },
  { detail: 'Table ready', label: 'Result', offset: 170, tone: 'orange' },
] satisfies TraceActivity[];
const TRACE_VISIBLE_ROWS = 3;
const TRACE_ROW_ADVANCE = 94;
const TRACE_VIEWPORT_HEIGHT = 334;
const TRACE_SCROLL_START_OFFSET = 64;
const TRACE_SCROLL_END_OFFSET = 206;
const TRACE_SCROLL_TRACK_HEIGHT = 302;
const TRACE_SCROLL_THUMB_HEIGHT = 96;
const fromOptions = { length: 34 } as const;
const textureDots = Array.from(fromOptions, (_, index) => {
  const computedValue3 = index * 0.37;
  const x = (noise2D('texture-x', computedValue3, 0.14) + 1) / 2;
  const computedValue4 = index * 0.41;
  const y = (noise2D('texture-y', 0.22, computedValue4) + 1) / 2;
  const leftValue = 3;
  const computedValue5 = index * 0.19;
  const size = leftValue + ((noise2D('texture-size', computedValue5, 0.72) + 1) / 2) * 8;
  const message3 = `${x * 100}%`;
  const leftValue2 = 0.07;
  const computedValue6 = index * 0.31;
  const computedValue7 = leftValue2 + ((noise2D('texture-opacity', computedValue6, 0.95) + 1) / 2) * 0.11;
  const currentSize = size;
  const message4 = `${y * 100}%`;
  return {
    left: message3,
    opacity: computedValue7,
    size: currentSize,
    top: message4,
  };
});
const typedTextAtFrame = (steps: readonly TypingStep[], frame: number): string => {
  let text = '';
  for (const step of steps) {
    if (step.frame > frame) return text;
    text = step.text;
  }
  return text;
};
const finalTypingFrame = (steps: readonly TypingStep[]): number => steps[steps.length - 1]?.frame ?? 0;
const SceneEffects = () => {
  const frame = useCurrentFrame();
  const values10: [number, number] = [0, 210];
  const values11: [number, number] = [0, 1];
  const shineProgress = clamp(frame, values10, values11);
  return (
    <>
      <Solid
        color={colors.background}
        effects={(() => {
          const effectNoiseOptions = { amount: 0.032, seed: 17 } as const;
          const effectNoiseResult = effectNoise(effectNoiseOptions);
          const vignetteOptions = { amount: 0.1, color: '#dce6e1', feather: 0.52, radius: 0.72 } as const;
          const vignetteResult = vignette(vignetteOptions);
          const shineOptions = {
            angle: 18,
            coreIntensity: 0.04,
            coreSigma: 82,
            haloIntensity: 0.045,
            haloSigma: 240,
            progress: shineProgress,
          } as const;
          const shineResult = shine(shineOptions);
          return [effectNoiseResult, vignetteResult, shineResult];
        })()}
        height={HEIGHT}
        style={{
          inset: 0,
          opacity: 0.72,
          position: 'absolute',
        }}
        width={WIDTH}
      />
      <div
        style={{
          inset: 0,
          opacity: 0.72,
          position: 'absolute',
        }}
      >
        {textureDots.map((dot, index) => (
          <div
            key={`${dot.left}-${dot.top}`}
            style={{
              backgroundColor: index % 3 === 0 ? colors.blue : index % 3 === 1 ? colors.green : colors.orange,
              borderRadius: 999,
              height: dot.size,
              left: dot.left,
              opacity: dot.opacity,
              position: 'absolute',
              top: dot.top,
              width: dot.size,
            }}
          />
        ))}
      </div>
    </>
  );
};
const Scene = ({ children, contentStyle }: { children: ReactNode; contentStyle?: CSSProperties }) => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.background,
      color: colors.charcoal,
      fontFamily: uiFontFamily,
      overflow: 'hidden',
    }}
  >
    <SceneEffects />
    <div
      style={{
        background: `linear-gradient(90deg, ${colors.green} 0 34%, ${colors.blue} 34% 68%, ${colors.orange} 68% 100%)`,
        height: 14,
        width: '100%',
      }}
    />
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 34,
        height: '100%',
        justifyContent: 'center',
        padding: '92px 118px 110px',
        ...contentStyle,
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);
const Dot = ({ color }: { color: string }) => (
  <span
    style={{
      backgroundColor: color,
      borderRadius: 999,
      display: 'inline-block',
      flex: '0 0 auto',
      height: 18,
      width: 18,
    }}
  />
);
const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      alignItems: 'center',
      color: colors.greenDark,
      display: 'flex',
      fontSize: 34,
      fontWeight: 800,
      gap: 18,
      letterSpacing: 0,
      textTransform: 'uppercase',
    }}
  >
    <Dot color={colors.green} />
    {children}
  </div>
);
const Headline = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <h1
    style={{
      color: colors.charcoal,
      fontSize: 88,
      fontWeight: 900,
      letterSpacing: 0,
      lineHeight: 0.98,
      margin: 0,
      maxWidth: 1320,
      ...style,
    }}
  >
    {children}
  </h1>
);
const SupportingText = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <p
    style={{
      color: colors.muted,
      fontSize: 38,
      fontWeight: 650,
      lineHeight: 1.24,
      margin: 0,
      maxWidth: 1380,
      ...style,
    }}
  >
    {children}
  </p>
);
const TerminalLine = ({ children, color = colors.charcoal }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      alignItems: 'center',
      color,
      display: 'flex',
      fontFamily: codeFontFamily,
      fontSize: 36,
      fontWeight: 750,
      gap: 18,
      minHeight: 52,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);
const toneStyles = {
  blue: { borderColor: '#93c5fd', color: colors.blue, soft: colors.softBlue, text: colors.blueDark },
  green: { borderColor: '#9ce2c3', color: colors.green, soft: colors.softGreen, text: colors.greenDark },
  orange: { borderColor: '#fdba74', color: colors.orange, soft: colors.softOrange, text: '#8a4b07' },
} satisfies Record<
  Tone,
  {
    borderColor: string;
    color: string;
    soft: string;
    text: string;
  }
>;
type CapabilityKind = 'automate' | 'collect' | 'research' | 'test';
const CapabilityBlock = ({
  caption,
  delay,
  index,
  kind,
  title,
  tone,
}: {
  caption: string;
  delay: number;
  index: string;
  kind: CapabilityKind;
  title: string;
  tone: Tone;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div
      style={(() => {
        const propertyValue = colors.panel;
        const propertyValue2 = theme.borderColor;
        const propertyValue3 = 'grid';
        const propertyValue4 = 20;
        const propertyValue5 = 'auto 1fr';
        const propertyValue6 = 214;
        const values12: [number, number] = [delay, delay + 22];
        const values13: [number, number] = [0, 1];
        const clampResult4 = clamp(frame, values12, values13);
        const propertyValue7 = 28;
        const values14: [number, number] = [delay, delay + 26];
        const values15: [number, number] = [0.95, 1];
        const clampResult5 = clamp(frame, values14, values15);
        const values16: [number, number] = [delay, delay + 28];
        const values17: [number, number] = [28, 0];
        const templateValue2 = clamp(frame, values16, values17);
        const message5 = `0 ${templateValue2}px`;
        const cardStyleOptions = {
          backgroundColor: propertyValue,
          borderColor: propertyValue2,
          display: propertyValue3,
          gap: propertyValue4,
          gridTemplateRows: propertyValue5,
          minHeight: propertyValue6,
          opacity: clampResult4,
          padding: propertyValue7,
          scale: clampResult5,
          translate: message5,
        };
        const options = { ...cardStyle(cardStyleOptions) };
        return {
          ...options,
        };
      })()}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
        <div
          style={{
            alignItems: 'center',
            backgroundColor: theme.soft,
            border: `2px solid ${theme.borderColor}`,
            borderRadius: 20,
            color: theme.text,
            display: 'flex',
            flex: '0 0 auto',
            fontSize: 30,
            fontWeight: 900,
            height: 64,
            justifyContent: 'center',
            width: 64,
          }}
        >
          {index}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: colors.charcoal, fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{title}</div>
          <div style={{ color: colors.muted, fontSize: 28, fontWeight: 760, lineHeight: 1.12 }}>
            {caption}
          </div>
        </div>
      </div>
      <CapabilityVisual delay={delay + 34} kind={kind} tone={tone} />
    </div>
  );
};
const CapabilityVisual = ({ delay, kind, tone }: { delay: number; kind: CapabilityKind; tone: Tone }) => {
  if (kind === 'research') return <ResearchVisual delay={delay} tone={tone} />;
  if (kind === 'collect') return <CollectVisual delay={delay} tone={tone} />;
  if (kind === 'automate') return <AutomateVisual delay={delay} tone={tone} />;
  return <TestVisual delay={delay} tone={tone} />;
};
const MiniChrome = ({ children, delay, title }: { children: ReactNode; delay: number; title: string }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...scaleInStyle(frame, delay),
        backgroundColor: '#f8faf9',
        border: `2px solid ${colors.border}`,
        borderRadius: 16,
        display: 'grid',
        gridTemplateRows: '34px 1fr',
        minHeight: 122,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          borderBottom: `2px solid ${colors.border}`,
          display: 'flex',
          gap: 7,
          padding: '0 12px',
        }}
      >
        <Dot color="#ef4444" />
        <Dot color="#f59e0b" />
        <Dot color="#22c55e" />
        <div style={{ color: colors.muted, fontSize: 18, fontWeight: 820, marginLeft: 'auto' }}>{title}</div>
      </div>
      {children}
    </div>
  );
};
const MiniCheck = ({ delay, size = 20 }: { delay: number; size?: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={(() => {
        const propertyValue8 = 'center';
        const propertyValue9 = colors.green;
        const propertyValue10 = 999;
        const propertyValue11 = '#fff';
        const propertyValue12 = 'flex';
        const computedValue8 = size * 0.62;
        const propertyValue13 = 900;
        const currentSize2 = size;
        const propertyValue14 = 'center';
        const values18: [number, number] = [delay, delay + 14];
        const values19: [number, number] = [0, 1];
        const clampResult6 = clamp(frame, values18, values19);
        const values20: [number, number] = [delay, delay + 18];
        const values21: [number, number] = [0.58, 1];
        const clampResult7 = clamp(frame, values20, values21);
        const currentSize3 = size;
        return {
          alignItems: propertyValue8,
          backgroundColor: propertyValue9,
          borderRadius: propertyValue10,
          color: propertyValue11,
          display: propertyValue12,
          fontSize: computedValue8,
          fontWeight: propertyValue13,
          height: currentSize2,
          justifyContent: propertyValue14,
          opacity: clampResult6,
          scale: clampResult7,
          width: currentSize3,
        };
      })()}
    >
      ✓
    </div>
  );
};
const SummaryBullet = ({ children, delay }: { children: ReactNode; delay: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={(() => {
        const propertyValue15 = 'center';
        const propertyValue16 = colors.charcoal;
        const propertyValue17 = 'grid';
        const propertyValue18 = 19;
        const propertyValue19 = 780;
        const propertyValue20 = 7;
        const propertyValue21 = '20px 1fr';
        const propertyValue22 = 1.06;
        const values22: [number, number] = [delay, delay + 16];
        const values23: [number, number] = [0, 1];
        const clampResult8 = clamp(frame, values22, values23);
        return {
          alignItems: propertyValue15,
          color: propertyValue16,
          display: propertyValue17,
          fontSize: propertyValue18,
          fontWeight: propertyValue19,
          gap: propertyValue20,
          gridTemplateColumns: propertyValue21,
          lineHeight: propertyValue22,
          opacity: clampResult8,
        };
      })()}
    >
      <MiniCheck delay={delay} size={18} />
      <span>{children}</span>
    </div>
  );
};
const ResearchVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 0.92fr' }}>
      <MiniChrome delay={delay} title="browser">
        <div style={{ display: 'grid', gap: 9, padding: 12 }}>
          {['pricing', 'docs', 'github'].map((tab, index) => (
            <div
              key={tab}
              style={(() => {
                const propertyValue23 = 'center';
                const propertyValue24 = index === 0 ? theme.soft : '#ffffff';
                const message6 = `2px solid ${index === 0 ? theme.borderColor : colors.border}`;
                const propertyValue25 = 999;
                const propertyValue26 = index === 0 ? theme.text : colors.muted;
                const propertyValue27 = 'flex';
                const propertyValue28 = 20;
                const propertyValue29 = 850;
                const propertyValue30 = 30;
                const propertyValue31 = 'center';
                const values24: [number, number] = [delay + 10 + index * 10, delay + 26 + index * 10];
                const values25: [number, number] = [0, 1];
                const clampResult9 = clamp(frame, values24, values25);
                const values26: [number, number] = [delay + 10 + index * 10, delay + 28 + index * 10];
                const values27: [number, number] = [0.86, 1];
                const clampResult10 = clamp(frame, values26, values27);
                return {
                  alignItems: propertyValue23,
                  backgroundColor: propertyValue24,
                  border: message6,
                  borderRadius: propertyValue25,
                  color: propertyValue26,
                  display: propertyValue27,
                  fontSize: propertyValue28,
                  fontWeight: propertyValue29,
                  height: propertyValue30,
                  justifyContent: propertyValue31,
                  opacity: clampResult9,
                  scale: clampResult10,
                };
              })()}
            >
              {tab}
            </div>
          ))}
        </div>
      </MiniChrome>
      <div
        style={(() => {
          const computedValue9 = delay + 46;
          const options2 = { ...scaleInStyle(frame, computedValue9) };
          const propertyValue32 = '#ffffff';
          const message7 = `2px solid ${theme.borderColor}`;
          const propertyValue33 = 16;
          const propertyValue34 = 'grid';
          const propertyValue35 = 8;
          const propertyValue36 = 14;
          return {
            ...options2,
            backgroundColor: propertyValue32,
            border: message7,
            borderRadius: propertyValue33,
            display: propertyValue34,
            gap: propertyValue35,
            padding: propertyValue36,
          };
        })()}
      >
        <div style={{ color: theme.text, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>Summary ready</div>
        <SummaryBullet delay={delay + 62}>pricing compared</SummaryBullet>
        <SummaryBullet delay={delay + 76}>docs checked</SummaryBullet>
        <SummaryBullet delay={delay + 90}>key differences found</SummaryBullet>
      </div>
    </div>
  );
};
const HighlightRow = ({
  delay,
  label,
  tone,
  value,
}: {
  delay: number;
  label: string;
  tone: Tone;
  value: string;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div
      style={(() => {
        const propertyValue37 = theme.soft;
        const message8 = `2px solid ${theme.borderColor}`;
        const propertyValue38 = 10;
        const propertyValue39 = theme.text;
        const propertyValue40 = 'grid';
        const propertyValue41 = 18;
        const propertyValue42 = 840;
        const propertyValue43 = 5;
        const propertyValue44 = '1fr auto';
        const values28: [number, number] = [delay, delay + 16];
        const values29: [number, number] = [0, 1];
        const clampResult11 = clamp(frame, values28, values29);
        const propertyValue45 = '6px 8px';
        return {
          backgroundColor: propertyValue37,
          border: message8,
          borderRadius: propertyValue38,
          color: propertyValue39,
          display: propertyValue40,
          fontSize: propertyValue41,
          fontWeight: propertyValue42,
          gap: propertyValue43,
          gridTemplateColumns: propertyValue44,
          opacity: clampResult11,
          padding: propertyValue45,
        };
      })()}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
};
const JsonLine = ({ delay, text }: { delay: number; text: string }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={(() => {
        const values30: [number, number] = [delay, delay + 14];
        const values31: [number, number] = [0, 1];
        const clampResult12 = clamp(frame, values30, values31);
        return { opacity: clampResult12 };
      })()}
    >
      {text}
    </div>
  );
};
const CollectVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 0.95fr' }}>
      <MiniChrome delay={delay} title="product page">
        <div style={{ display: 'grid', gap: 7, padding: 12 }}>
          <HighlightRow delay={delay + 20} label="Price" tone={tone} value="$29" />
          <HighlightRow delay={delay + 34} label="Rating" tone={tone} value="4.8" />
          <HighlightRow delay={delay + 48} label="Availability" tone={tone} value="in stock" />
        </div>
      </MiniChrome>
      <div
        style={(() => {
          const computedValue10 = delay + 56;
          const options3 = { ...scaleInStyle(frame, computedValue10) };
          const propertyValue46 = colors.charcoal;
          const propertyValue47 = 16;
          const propertyValue48 = '#dff5eb';
          const propertyValue49 = 'grid';
          const currentCodeFontFamily = codeFontFamily;
          const propertyValue50 = 19;
          const propertyValue51 = 760;
          const propertyValue52 = 1.3;
          const propertyValue53 = '13px 15px';
          return {
            ...options3,
            backgroundColor: propertyValue46,
            borderRadius: propertyValue47,
            color: propertyValue48,
            display: propertyValue49,
            fontFamily: currentCodeFontFamily,
            fontSize: propertyValue50,
            fontWeight: propertyValue51,
            lineHeight: propertyValue52,
            padding: propertyValue53,
          };
        })()}
      >
        <JsonLine delay={delay + 62} text="{" />
        <JsonLine delay={delay + 72} text={'  "price": "$29",'} />
        <JsonLine delay={delay + 82} text={'  "rating": "4.8",'} />
        <JsonLine delay={delay + 92} text={'  "stock": "in stock"'} />
        <JsonLine delay={delay + 102} text="}" />
        <div
          style={(() => {
            const propertyValue54 = theme.color;
            const propertyValue55 = 999;
            const propertyValue56 = 6;
            const propertyValue57 = 6;
            const values32: [number, number] = [delay + 68, delay + 108];
            const values33: [number, number] = [0, 100];
            const templateValue3 = clamp(frame, values32, values33);
            const message9 = `${templateValue3}%`;
            return {
              backgroundColor: propertyValue54,
              borderRadius: propertyValue55,
              height: propertyValue56,
              marginTop: propertyValue57,
              width: message9,
            };
          })()}
        />
      </div>
    </div>
  );
};
const WorkflowStep = ({
  delay,
  icon,
  label,
  tone,
}: {
  delay: number;
  icon: string;
  label: string;
  tone: Tone;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div
      style={(() => {
        const propertyValue58 = 'center';
        const propertyValue59 = '#ffffff';
        const message10 = `2px solid ${theme.borderColor}`;
        const propertyValue60 = 16;
        const propertyValue61 = colors.charcoal;
        const propertyValue62 = 'grid';
        const propertyValue63 = 6;
        const propertyValue64 = 'center';
        const propertyValue65 = 78;
        const values34: [number, number] = [delay, delay + 16];
        const values35: [number, number] = [0, 1];
        const clampResult13 = clamp(frame, values34, values35);
        const propertyValue66 = '9px 8px';
        const values36: [number, number] = [delay, delay + 18];
        const values37: [number, number] = [0.86, 1];
        const clampResult14 = clamp(frame, values36, values37);
        return {
          alignItems: propertyValue58,
          backgroundColor: propertyValue59,
          border: message10,
          borderRadius: propertyValue60,
          color: propertyValue61,
          display: propertyValue62,
          gap: propertyValue63,
          justifyItems: propertyValue64,
          minHeight: propertyValue65,
          opacity: clampResult13,
          padding: propertyValue66,
          scale: clampResult14,
        };
      })()}
    >
      <div
        style={{
          alignItems: 'center',
          backgroundColor: theme.soft,
          borderRadius: 999,
          color: theme.text,
          display: 'flex',
          fontSize: 18,
          fontWeight: 900,
          height: 30,
          justifyContent: 'center',
          width: 42,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 19, fontWeight: 870, lineHeight: 1 }}>{label}</div>
    </div>
  );
};
const WorkflowConnector = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div
      style={(() => {
        const propertyValue67 = 'center';
        const values38: [number, number] = [delay, delay + 22];
        const values39: [number, number] = [0, 1];
        const clampResult15 = clamp(frame, values38, values39);
        const values40: [number, number] = [delay, delay + 22];
        const values41: [number, number] = [0.76, 1];
        const clampResult16 = clamp(frame, values40, values41);
        return {
          alignSelf: propertyValue67,
          opacity: clampResult15,
          scale: clampResult16,
        };
      })()}
    >
      <Arrow
        cornerRadius={3}
        direction="right"
        fill={theme.color}
        headLength={10}
        headWidth={16}
        length={26}
        shaftWidth={6}
        style={{ display: 'block', height: 16, width: 26 }}
      />
    </div>
  );
};
const AutomateVisual = ({ delay, tone }: { delay: number; tone: Tone }) => (
  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 26px 1fr 26px 1fr 26px 1fr' }}>
    <WorkflowStep delay={delay} icon="ID" label="Profile" tone={tone} />
    <WorkflowConnector delay={delay + 18} tone={tone} />
    <WorkflowStep delay={delay + 32} icon="Aa" label="Form" tone={tone} />
    <WorkflowConnector delay={delay + 50} tone={tone} />
    <WorkflowStep delay={delay + 64} icon=">" label="Click" tone={tone} />
    <WorkflowConnector delay={delay + 82} tone={tone} />
    <WorkflowStep delay={delay + 96} icon="DL" label="Download" tone={tone} />
  </div>
);
const TestFlowStep = ({ delay, label, tone }: { delay: number; label: string; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];
  return (
    <div
      style={(() => {
        const propertyValue68 = 'center';
        const propertyValue69 = 'grid';
        const propertyValue70 = 8;
        const propertyValue71 = 'center';
        const values42: [number, number] = [delay, delay + 16];
        const values43: [number, number] = [0, 1];
        const clampResult17 = clamp(frame, values42, values43);
        return {
          alignItems: propertyValue68,
          display: propertyValue69,
          gap: propertyValue70,
          justifyItems: propertyValue71,
          opacity: clampResult17,
        };
      })()}
    >
      <div
        style={{
          backgroundColor: theme.soft,
          border: `2px solid ${theme.borderColor}`,
          borderRadius: 14,
          color: theme.text,
          fontSize: 19,
          fontWeight: 870,
          padding: '10px 8px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {label}
      </div>
      <MiniCheck delay={delay + 12} size={24} />
    </div>
  );
};
const TestVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...scaleInStyle(frame, delay),
        backgroundColor: '#f8faf9',
        border: `2px solid ${colors.border}`,
        borderRadius: 16,
        display: 'grid',
        gap: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          border: `2px solid ${colors.border}`,
          borderRadius: 12,
          height: 18,
          overflow: 'hidden',
        }}
      >
        <div
          style={(() => {
            const propertyValue72 = colors.green;
            const propertyValue73 = '100%';
            const values44: [number, number] = [delay + 20, delay + 96];
            const values45: [number, number] = [0, 100];
            const templateValue4 = clamp(frame, values44, values45);
            const message11 = `${templateValue4}%`;
            return {
              backgroundColor: propertyValue72,
              height: propertyValue73,
              width: message11,
            };
          })()}
        />
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {['Login', 'Cart', 'Checkout', 'Success'].map((label, index) => (
          <TestFlowStep delay={delay + 20 + index * 18} key={label} label={label} tone={tone} />
        ))}
      </div>
    </div>
  );
};
const STAR_CLICK_FRAME = 122;
const STAR_BUTTON_SIZE = 244;
const STAR_ICON_SIZE = 120;
const STAR_STAGE_SIZE = 324;
const StarIcon = ({
  clickFrame,
  frame,
  size = STAR_ICON_SIZE,
}: {
  clickFrame: number;
  frame: number;
  size?: number;
}) => {
  const values46: [number, number] = [clickFrame + 14, clickFrame + 38];
  const values47: [number, number] = [0, 1];
  const fillOpacity = clamp(frame, values46, values47);
  const values48 = [clickFrame, clickFrame + 18, clickFrame + 42, clickFrame + 68];
  const values49 = [1, 0.72, 1.12, 1];
  const interpolateOptions2 = {
    easing: Easing.bezier(0.7, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;
  const iconScale = interpolate(frame, values48, values49, interpolateOptions2);
  return (
    <Star
      effects={(() => {
        const propertyValue74 = colors.orange;
        const values50: [number, number] = [clickFrame + 8, clickFrame + 46];
        const values51: [number, number] = [0.2, 0.95];
        const clampResult18 = clamp(frame, values50, values51);
        const propertyValue75 = 16;
        const propertyValue76 = 0.05;
        const glowOptions = {
          color: propertyValue74,
          intensity: clampResult18,
          radius: propertyValue75,
          threshold: propertyValue76,
        };
        const glowResult = glow(glowOptions);
        const propertyValue77 = -28;
        const propertyValue78 = 0.24;
        const propertyValue79 = 0.18;
        const values52: [number, number] = [clickFrame + 8, clickFrame + 70];
        const values53: [number, number] = [0, 1];
        const clampResult19 = clamp(frame, values52, values53);
        const shineOptions2 = {
          angle: propertyValue77,
          coreIntensity: propertyValue78,
          haloIntensity: propertyValue79,
          progress: clampResult19,
        };
        const shineResult2 = shine(shineOptions2);
        return [glowResult, shineResult2];
      })()}
      fill={colors.orange}
      fillOpacity={fillOpacity}
      innerRadius={size * 0.24}
      outerRadius={size * 0.49}
      points={5}
      stroke={colors.orange}
      strokeLinejoin="round"
      strokeWidth={3}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 18px 18px rgb(217 119 6 / 0.22))',
        height: size,
        scale: iconScale,
        width: size,
      }}
    />
  );
};
const StarParticle = ({
  clickFrame,
  color,
  frame,
  index,
  total,
}: {
  clickFrame: number;
  color: string;
  frame: number;
  index: number;
  total: number;
}) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const values54: [number, number] = [clickFrame + 12, clickFrame + 72];
  const values55: [number, number] = [0, 1];
  const progress = clamp(frame, values54, values55);
  const values56: [number, number] = [clickFrame + 50, clickFrame + 88];
  const values57: [number, number] = [1, 0];
  const fadeOut = clamp(frame, values56, values57);
  const values58: [number, number] = [clickFrame + 12, clickFrame + 42];
  const values59: [number, number] = [18, 54];
  const length = clamp(frame, values58, values59) * fadeOut;
  const radius = 148 * progress;
  return (
    <div
      style={(() => {
        const currentColor = color;
        const propertyValue80 = 999;
        const currentLength = length;
        const propertyValue81 = '50%';
        const values60: [number, number] = [clickFrame + 10, clickFrame + 18];
        const values61: [number, number] = [0, 1];
        const computedValue11 = clamp(frame, values60, values61) * fadeOut;
        const propertyValue82 = 'absolute';
        const message12 = `${(angle * 180) / Math.PI}deg`;
        const propertyValue83 = '50%';
        const message13 = `${Math.cos(angle) * radius}px ${Math.sin(angle) * radius}px`;
        const propertyValue84 = 18;
        return {
          backgroundColor: currentColor,
          borderRadius: propertyValue80,
          height: currentLength,
          left: propertyValue81,
          opacity: computedValue11,
          position: propertyValue82,
          rotate: message12,
          top: propertyValue83,
          translate: message13,
          width: propertyValue84,
        };
      })()}
    />
  );
};
const StarRipple = ({ clickFrame, frame }: { clickFrame: number; frame: number }) => {
  const values62: [number, number] = [clickFrame + 4, clickFrame + 12];
  const values63: [number, number] = [0, 0.9];
  const leftValue3 = clamp(frame, values62, values63);
  const values64: [number, number] = [clickFrame + 36, clickFrame + 78];
  const values65: [number, number] = [1, 0];
  const opacity = leftValue3 * clamp(frame, values64, values65);
  const values66: [number, number] = [clickFrame + 4, clickFrame + 76];
  const values67: [number, number] = [0.08, 4.2];
  const scale = clamp(frame, values66, values67);
  return (
    <div
      style={{
        border: `28px solid ${colors.orange}`,
        borderRadius: 999,
        height: STAR_BUTTON_SIZE,
        opacity,
        position: 'absolute',
        scale,
        width: STAR_BUTTON_SIZE,
      }}
    />
  );
};
const StarLikeButton = ({ frame }: { frame: number }) => {
  const values68: [number, number] = [40, 74];
  const values69: [number, number] = [0.78, 1];
  const entryScale = clamp(frame, values68, values69);
  const values70 = [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 16, STAR_CLICK_FRAME + 38, STAR_CLICK_FRAME + 66];
  const values71 = [1, 0.9, 1.04, 1];
  const interpolateOptions3 = {
    easing: Easing.bezier(0.7, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;
  const pressScale = interpolate(frame, values70, values71, interpolateOptions3);
  const values72 = [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 16, STAR_CLICK_FRAME + 42];
  const values73 = [1, 0.5, 1];
  const interpolateOptions4 = {
    easing: Easing.bezier(0.7, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;
  const shadowScale = interpolate(frame, values72, values73, interpolateOptions4);
  const particles = ['#12805c', '#2563eb', '#d97706', '#0f513d', '#93c5fd', '#fdba74', '#17211f', '#9ce2c3'];
  return (
    <div
      style={(() => {
        const propertyValue85 = 'center';
        const propertyValue86 = 'flex';
        const currentSTAR_STAGE_SIZE = STAR_STAGE_SIZE;
        const propertyValue87 = 'center';
        const values74: [number, number] = [34, 62];
        const values75: [number, number] = [0, 1];
        const clampResult20 = clamp(frame, values74, values75);
        const propertyValue88 = 'relative';
        const currentEntryScale = entryScale;
        const currentSTAR_STAGE_SIZE2 = STAR_STAGE_SIZE;
        return {
          alignItems: propertyValue85,
          display: propertyValue86,
          height: currentSTAR_STAGE_SIZE,
          justifyContent: propertyValue87,
          opacity: clampResult20,
          position: propertyValue88,
          scale: currentEntryScale,
          width: currentSTAR_STAGE_SIZE2,
        };
      })()}
    >
      <div
        style={{
          backgroundColor: 'rgb(23 33 31 / 0.20)',
          borderRadius: 999,
          filter: 'blur(4px)',
          height: STAR_BUTTON_SIZE,
          position: 'absolute',
          scale: shadowScale,
          translate: '0 30px',
          width: STAR_BUTTON_SIZE,
        }}
      />
      <div
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 999,
          boxShadow: '0 38px 80px rgb(23 33 31 / 0.24)',
          display: 'grid',
          height: STAR_BUTTON_SIZE,
          justifyItems: 'center',
          overflow: 'hidden',
          placeItems: 'center',
          position: 'relative',
          scale: pressScale,
          width: STAR_BUTTON_SIZE,
        }}
      >
        <StarRipple clickFrame={STAR_CLICK_FRAME} frame={frame} />
        <StarIcon clickFrame={STAR_CLICK_FRAME} frame={frame} />
      </div>
      <CtaLottieAccent frame={frame} />
      <CtaEmojiAccent frame={frame} />
      {particles.map((color, index) => (
        <StarParticle
          clickFrame={STAR_CLICK_FRAME}
          color={color}
          frame={frame}
          index={index}
          key={color}
          total={particles.length}
        />
      ))}
    </div>
  );
};
const parseLottieAnimationData = (value: unknown): LottieAnimationData => value as LottieAnimationData;
const useLottieAnimationData = (path: string): LottieAnimationData | null => {
  const [handle] = useState(() => {
    const message14 = `Load ${path}`;
    return delayRender(message14);
  });
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);
  const values76 = [handle, path];
  useEffect(() => {
    let mounted = true;
    const staticFileResult = staticFile(path);
    fetch(staticFileResult)
      .then(async (response) => {
        if (!response.ok) {
          const message15 = `Unable to load Lottie asset: ${path}`;
          throw new Error(message15);
        }
        const jsonResult = await response.json();
        return parseLottieAnimationData(jsonResult);
      })
      .then((loadedAnimationData) => {
        if (mounted) setAnimationData(loadedAnimationData);
        continueRender(handle);
      })
      .catch((error: unknown) => {
        cancelRender(error);
      });
    return () => {
      mounted = false;
    };
  }, values76);
  return animationData;
};
const CtaLottieAccent = ({ frame }: { frame: number }) => {
  const animationData = useLottieAnimationData('sparkle-burst.json');
  const values77: [number, number] = [STAR_CLICK_FRAME + 8, STAR_CLICK_FRAME + 24];
  const values78: [number, number] = [0, 0.8];
  const leftValue4 = clamp(frame, values77, values78);
  const values79: [number, number] = [STAR_CLICK_FRAME + 92, STAR_CLICK_FRAME + 132];
  const values80: [number, number] = [1, 0];
  const opacity = leftValue4 * clamp(frame, values79, values80);
  if (!animationData) return null;
  return (
    <div
      style={{
        height: 210,
        left: '50%',
        opacity,
        pointerEvents: 'none',
        position: 'absolute',
        top: '50%',
        translate: '-186px -178px',
        width: 210,
      }}
    >
      <Lottie
        animationData={animationData}
        loop
        playbackRate={1.25}
        style={{ display: 'block', height: '100%', width: '100%' }}
      />
    </div>
  );
};
const CtaEmojiAccent = ({ frame }: { frame: number }) => {
  const values81: [number, number] = [STAR_CLICK_FRAME + 22, STAR_CLICK_FRAME + 42];
  const values82: [number, number] = [0, 0.9];
  const leftValue5 = clamp(frame, values81, values82);
  const values83: [number, number] = [STAR_CLICK_FRAME + 118, STAR_CLICK_FRAME + 154];
  const values84: [number, number] = [1, 0];
  const opacity = leftValue5 * clamp(frame, values83, values84);
  const values85: [number, number] = [STAR_CLICK_FRAME + 24, STAR_CLICK_FRAME + 54];
  const values86: [number, number] = [0.66, 1];
  const accentScale = clamp(frame, values85, values86);
  return (
    <div
      style={{
        height: 78,
        left: '50%',
        opacity,
        pointerEvents: 'none',
        position: 'absolute',
        scale: accentScale,
        top: '50%',
        translate: '90px -164px',
        width: 78,
      }}
    >
      <AnimatedEmoji
        emoji="glowing-star"
        playbackRate={1.3}
        scale="0.5"
        style={{ display: 'block', height: '100%', width: '100%' }}
      />
    </div>
  );
};
const StarCursorPointer = () => {
  const frame = useCurrentFrame();
  const values87: [number, number] = [84, STAR_CLICK_FRAME];
  const values88: [number, number] = [196, 66];
  const cursorX = clamp(frame, values87, values88);
  const values89: [number, number] = [84, STAR_CLICK_FRAME];
  const values90: [number, number] = [204, 92];
  const cursorY = clamp(frame, values89, values90);
  const values91: [number, number] = [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 10];
  const values92: [number, number] = [1, 0.78];
  const leftValue6 = clamp(frame, values91, values92);
  const values93: [number, number] = [STAR_CLICK_FRAME + 10, STAR_CLICK_FRAME + 28];
  const values94: [number, number] = [1, 1.18];
  const clickScale = leftValue6 * clamp(frame, values93, values94);
  return (
    <div
      style={(() => {
        const propertyValue89 = colors.charcoal;
        const propertyValue90 = 'polygon(0 0, 0 100%, 32% 72%, 52% 100%, 68% 91%, 48% 63%, 86% 63%)';
        const propertyValue91 = 'drop-shadow(0 10px 14px rgb(23 33 31 / 0.22))';
        const propertyValue92 = 72;
        const propertyValue93 = '50%';
        const values95: [number, number] = [78, 90];
        const values96: [number, number] = [0, 1];
        const leftValue7 = clamp(frame, values95, values96);
        const values97: [number, number] = [180, 210];
        const values98: [number, number] = [1, 0];
        const computedValue12 = leftValue7 * clamp(frame, values97, values98);
        const propertyValue94 = 'absolute';
        const currentClickScale = clickScale;
        const propertyValue95 = '50%';
        const message16 = `${cursorX}px ${cursorY}px`;
        const propertyValue96 = 58;
        return {
          backgroundColor: propertyValue89,
          clipPath: propertyValue90,
          filter: propertyValue91,
          height: propertyValue92,
          left: propertyValue93,
          opacity: computedValue12,
          position: propertyValue94,
          scale: currentClickScale,
          top: propertyValue95,
          translate: message16,
          width: propertyValue96,
        };
      })()}
    />
  );
};
const StarAction = ({ frame }: { frame: number }) => (
  <div
    style={{
      alignItems: 'center',
      display: 'grid',
      gap: 18,
      justifyItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}
  >
    <div style={{ position: 'relative' }}>
      <StarLikeButton frame={frame} />
      <Trail lagInFrames={0.28} layers={7} trailOpacity={0.18}>
        <AbsoluteFill style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <StarCursorPointer />
        </AbsoluteFill>
      </Trail>
    </div>
    <div style={{ ...enterStyle(frame, 62), color: colors.charcoal, fontSize: 46, fontWeight: 900 }}>
      Star the project
    </div>
    <div style={{ ...enterStyle(frame, 74), color: colors.muted, fontSize: 34, fontWeight: 800 }}>
      Star the repo · Read the docs
    </div>
  </div>
);
const HumanTypedPrompt = ({
  startFrame = 20,
  steps,
  style,
}: {
  startFrame?: number;
  steps: readonly TypingStep[];
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const computedValue13 = frame - startFrame;
  const maxResult = Math.max(0, computedValue13);
  const visibleText = typedTextAtFrame(steps, maxResult);
  const isTyping = visibleText !== researchPrompt;
  const cursorVisible =
    isTyping ||
    (() => {
      const computedValue14 = frame / 12;
      return Math.floor(computedValue14) % 2 === 0;
    })();
  return (
    <span style={style}>
      {visibleText}
      <span style={{ color: colors.blue, opacity: cursorVisible ? 1 : 0 }}>|</span>
    </span>
  );
};
const ChatControl = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'blue' | 'neutral' }) => (
  <div
    style={{
      alignItems: 'center',
      backgroundColor: tone === 'blue' ? colors.softBlue : '#eef3f1',
      border: `2px solid ${tone === 'blue' ? '#93c5fd' : colors.border}`,
      borderRadius: 999,
      color: tone === 'blue' ? colors.blueDark : colors.muted,
      display: 'flex',
      fontSize: 22,
      fontWeight: 850,
      height: 44,
      padding: '0 18px',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);
const ChatHeader = () => (
  <div
    style={{
      backgroundColor: '#edf3f0',
      borderBottom: `2px solid ${colors.border}`,
      display: 'flex',
      gap: 12,
      padding: '18px 22px',
    }}
  >
    <Dot color={colors.green} />
    <div style={{ color: colors.charcoal, fontSize: 25, fontWeight: 900 }}>CloakBrowser MCP</div>
    <div style={{ color: colors.muted, fontSize: 24, fontWeight: 750, marginLeft: 'auto' }}>
      Research chat
    </div>
  </div>
);
const ChatAssistantBubble = () => (
  <>
    <div
      style={{
        display: 'grid',
        gap: 18,
        gridTemplateColumns: '72px 1fr',
        padding: '26px 30px 18px',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backgroundColor: colors.charcoal,
          borderRadius: 18,
          color: '#fff',
          display: 'flex',
          fontSize: 28,
          fontWeight: 900,
          height: 58,
          justifyContent: 'center',
          width: 58,
        }}
      >
        AI
      </div>
      <div
        style={{
          backgroundColor: '#ffffff',
          border: `2px solid ${colors.border}`,
          borderRadius: 22,
          color: colors.muted,
          fontSize: 28,
          fontWeight: 750,
          lineHeight: 1.25,
          padding: '20px 24px',
        }}
      >
        Ask once. The agent drives the browser.
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '0 30px 18px 120px',
      }}
    >
      <ChatControl tone="blue">browser tools</ChatControl>
      <ChatControl>CloakBrowser</ChatControl>
    </div>
  </>
);
const SubmitButton = ({ submitFrame }: { submitFrame: number }) => {
  const frame = useCurrentFrame();
  const values99: [number, number] = [submitFrame, submitFrame + 8];
  const values100: [number, number] = [0, 1];
  const leftValue8 = clamp(frame, values99, values100);
  const values101: [number, number] = [submitFrame + 8, submitFrame + 24];
  const values102: [number, number] = [1, 0];
  const press = leftValue8 * clamp(frame, values101, values102);
  const values103: [number, number] = [submitFrame + 8, submitFrame + 16];
  const values104: [number, number] = [0, 0.32];
  const leftValue9 = clamp(frame, values103, values104);
  const values105: [number, number] = [submitFrame + 16, submitFrame + 42];
  const values106: [number, number] = [1, 0];
  const pulseOpacity = leftValue9 * clamp(frame, values105, values106);
  return (
    <div style={{ height: 52, marginLeft: 'auto', position: 'relative', width: 52 }}>
      <div
        style={(() => {
          const propertyValue97 = colors.green;
          const propertyValue98 = 999;
          const propertyValue99 = -8;
          const currentPulseOpacity = pulseOpacity;
          const propertyValue100 = 'absolute';
          const values107: [number, number] = [submitFrame + 8, submitFrame + 42];
          const values108: [number, number] = [0.75, 1.38];
          const clampResult21 = clamp(frame, values107, values108);
          return {
            backgroundColor: propertyValue97,
            borderRadius: propertyValue98,
            inset: propertyValue99,
            opacity: currentPulseOpacity,
            position: propertyValue100,
            scale: clampResult21,
          };
        })()}
      />
      <div
        style={{
          alignItems: 'center',
          backgroundColor: colors.charcoal,
          borderRadius: 999,
          color: '#fff',
          display: 'flex',
          fontSize: 32,
          fontWeight: 900,
          height: 52,
          justifyContent: 'center',
          position: 'relative',
          scale: 1 - press * 0.14,
          translate: `${press * 4}px 0`,
          width: 52,
        }}
      >
        &gt;
      </div>
    </div>
  );
};
const ChatComposer = ({ startFrame, submitFrame }: { startFrame: number; submitFrame: number }) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      border: `2px solid ${colors.border}`,
      borderRadius: 30,
      boxShadow: '0 18px 44px rgb(23 33 31 / 0.10)',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      margin: 'auto 30px 30px',
      minHeight: 164,
      padding: '24px 26px 22px',
    }}
  >
    <HumanTypedPrompt
      startFrame={startFrame}
      steps={researchTypingSteps}
      style={{ color: colors.charcoal, fontSize: 35, fontWeight: 850, lineHeight: 1.2 }}
    />
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        gap: 12,
        marginTop: 'auto',
      }}
    >
      <ChatControl>+</ChatControl>
      <ChatControl>FX rates</ChatControl>
      <SubmitButton submitFrame={submitFrame} />
    </div>
  </div>
);
const ChatPromptPanel = ({ startFrame, submitFrame }: { startFrame: number; submitFrame: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={(() => {
        const cardStyleOptions2 = {
          ...scaleInStyle(frame, 22),
          backgroundColor: '#f8faf9',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 438,
          overflow: 'hidden',
          padding: 0,
          position: 'relative',
        } as const;
        const options4 = { ...cardStyle(cardStyleOptions2) };
        return {
          ...options4,
        };
      })()}
    >
      <ChatHeader />
      <ChatAssistantBubble />
      <ChatComposer startFrame={startFrame} submitFrame={submitFrame} />
    </div>
  );
};
const TraceStep = ({
  delay,
  detail,
  label,
  tone = 'green',
}: {
  delay: number;
  detail: string;
  label: string;
  tone?: Tone;
}) => {
  const frame = useCurrentFrame();
  const toneColor = tone === 'blue' ? colors.blue : tone === 'orange' ? colors.orange : colors.green;
  return (
    <div
      style={{
        ...enterStyle(frame, delay),
        backgroundColor: '#ffffff',
        border: `2px solid ${colors.border}`,
        borderRadius: 20,
        display: 'grid',
        gap: 7,
        minHeight: 82,
        padding: '14px 18px',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          color: toneColor,
          display: 'flex',
          fontSize: 21,
          fontWeight: 900,
          gap: 10,
          textTransform: 'uppercase',
        }}
      >
        <Dot color={toneColor} />
        {label}
      </div>
      <div
        style={{
          color: colors.charcoal,
          fontFamily: label === 'Tool' ? codeFontFamily : undefined,
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1.18,
        }}
      >
        {detail}
      </div>
    </div>
  );
};
const traceScrollY = (frame: number, startFrame: number): number => {
  const values109: [number, number] = [
    startFrame + TRACE_SCROLL_START_OFFSET,
    startFrame + TRACE_SCROLL_END_OFFSET,
  ];
  const values110: [number, number] = [0, (traceActivities.length - TRACE_VISIBLE_ROWS) * TRACE_ROW_ADVANCE];
  return clamp(frame, values109, values110);
};
const TraceScrollbar = ({ frame, startFrame }: { frame: number; startFrame: number }) => {
  const values111: [number, number] = [
    startFrame + TRACE_SCROLL_START_OFFSET,
    startFrame + TRACE_SCROLL_END_OFFSET,
  ];
  const values112: [number, number] = [0, TRACE_SCROLL_TRACK_HEIGHT - TRACE_SCROLL_THUMB_HEIGHT];
  const thumbY = clamp(frame, values111, values112);
  return (
    <div
      style={{
        backgroundColor: '#e4ebe8',
        borderRadius: 999,
        bottom: 16,
        position: 'absolute',
        right: 10,
        top: 16,
        width: 9,
      }}
    >
      <div
        style={{
          backgroundColor: colors.green,
          borderRadius: 999,
          height: TRACE_SCROLL_THUMB_HEIGHT,
          translate: `0 ${thumbY}px`,
          width: '100%',
        }}
      />
    </div>
  );
};
const TraceViewport = ({ frame, startFrame }: { frame: number; startFrame: number }) => {
  const scrollY = traceScrollY(frame, startFrame);
  return (
    <div
      style={{
        borderRadius: 22,
        flex: 1,
        minHeight: TRACE_VIEWPORT_HEIGHT,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingRight: 22,
          translate: `0 -${scrollY}px`,
        }}
      >
        {traceActivities.map((activity) => (
          <TraceStep
            delay={startFrame + activity.offset}
            detail={activity.detail}
            key={`${activity.label}-${activity.offset}`}
            label={activity.label}
            tone={activity.tone}
          />
        ))}
      </div>
      <TraceScrollbar frame={frame} startFrame={startFrame} />
    </div>
  );
};
const AgentTrace = ({ startFrame }: { startFrame: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={(() => {
        const cardStyleOptions3 = {
          ...scaleInStyle(frame, startFrame),
          backgroundColor: '#f8faf9',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 438,
          padding: 24,
        } as const;
        const options5 = { ...cardStyle(cardStyleOptions3) };
        return {
          ...options5,
        };
      })()}
    >
      <div
        style={{
          alignItems: 'center',
          color: colors.muted,
          display: 'flex',
          fontSize: 27,
          fontWeight: 900,
          gap: 14,
          padding: '0 4px 4px',
        }}
      >
        <Dot color={colors.blue} />
        agent activity
      </div>
      <TraceViewport frame={frame} startFrame={startFrame} />
    </div>
  );
};
const IntroScene = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <div style={{ ...enterStyle(frame, 0), width: 620 }}>
        <Img src={staticFile('logo-wordmark.svg')} style={{ display: 'block', width: '100%' }} />
      </div>
      <div style={{ ...enterStyle(frame, 6), display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Eyebrow>stealth chromium for ai agents</Eyebrow>
        <Headline style={{ fontSize: 106, maxWidth: 1540 }}>
          Stealth Chromium
          <br />
          for developers and automation.
        </Headline>
        <SupportingText>Real browser control for AI agents.</SupportingText>
      </div>
      <div
        style={(() => {
          const cardStyleOptions4 = {
            ...scaleInStyle(frame, 24),
            display: 'grid',
            gap: 18,
            maxWidth: 1140,
            padding: 34,
          } as const;
          const options6 = { ...cardStyle(cardStyleOptions4) };
          return {
            ...options6,
          };
        })()}
      >
        <TerminalLine>
          <span style={{ color: colors.green }}>$</span>
          npx -y cloakbrowser-mcp@latest
        </TerminalLine>
      </div>
    </Scene>
  );
};
const ResearchScene = () => {
  const frame = useCurrentFrame();
  const promptStartFrame = 82;
  const promptDoneFrame = finalTypingFrame(researchTypingSteps) + promptStartFrame;
  const submitFrame = promptDoneFrame + 20;
  const activityStartFrame = submitFrame + 36;
  return (
    <Scene
      contentStyle={{
        boxSizing: 'border-box',
        gap: 22,
        height: 'calc(100% - 14px)',
        justifyContent: 'flex-start',
        padding: '54px 118px 68px',
      }}
    >
      <div style={{ ...enterStyle(frame, 0), display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Eyebrow>website exploration</Eyebrow>
        <Headline style={{ fontSize: 74, maxWidth: 1680 }}>Ask for web research, not scraping code.</Headline>
        <SupportingText>Open sites, compare pages, and return a structured summary.</SupportingText>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 32,
          gridTemplateColumns: '1.08fr 0.92fr',
          height: 520,
          maxWidth: 1580,
        }}
      >
        <ChatPromptPanel startFrame={promptStartFrame} submitFrame={submitFrame} />
        <AgentTrace startFrame={activityStartFrame} />
      </div>
    </Scene>
  );
};
const ConclusionScene = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <div style={{ ...enterStyle(frame, 0), display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Eyebrow>browser capabilities</Eyebrow>
        <Headline style={{ fontSize: 78, maxWidth: 1500 }}>Work with the web like a user.</Headline>
        <SupportingText>Research, collect, automate, and test.</SupportingText>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: '1fr 1fr',
          maxWidth: 1580,
        }}
      >
        <CapabilityBlock
          caption="Compare pages and summarize findings"
          delay={34}
          index="01"
          kind="research"
          title="Research"
          tone="green"
        />
        <CapabilityBlock
          caption="Extract page data into structured output"
          delay={54}
          index="02"
          kind="collect"
          title="Collect"
          tone="blue"
        />
        <CapabilityBlock
          caption="Run repeatable browser workflows"
          delay={74}
          index="03"
          kind="automate"
          title="Automate"
          tone="orange"
        />
        <CapabilityBlock
          caption="Check end-to-end paths"
          delay={94}
          index="04"
          kind="test"
          title="Test"
          tone="green"
        />
      </div>
    </Scene>
  );
};
const CtaScene = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 34,
          textAlign: 'center',
        }}
      >
        <Img
          src={staticFile('logo-wordmark.svg')}
          style={{ ...enterStyle(frame, 0), display: 'block', width: 610 }}
        />
        <div style={{ ...enterStyle(frame, 8), display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Eyebrow>start in one command</Eyebrow>
          <Headline style={{ maxWidth: 1420 }}>Install CloakBrowser MCP.</Headline>
        </div>
        <div
          style={(() => {
            const cardStyleOptions5 = {
              ...scaleInStyle(frame, 28),
              minWidth: 1120,
              padding: '38px 46px',
              textAlign: 'left',
            } as const;
            const options7 = { ...cardStyle(cardStyleOptions5) };
            return {
              ...options7,
            };
          })()}
        >
          <TerminalLine>
            <span style={{ color: colors.green }}>$</span>
            npx -y cloakbrowser-mcp@latest
          </TerminalLine>
        </div>
        <StarAction frame={frame} />
      </div>
    </Scene>
  );
};
const Demo = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[0]}>
        <IntroScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.introToResearch}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[1]}>
        <ResearchScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.researchToCapabilities}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[2]}>
        <ConclusionScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.capabilitiesToCta}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[3]}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
export const RemotionRoot = () => (
  <Composition
    component={Demo}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    height={HEIGHT}
    id="CloakBrowserMcpDemo"
    width={WIDTH}
  />
);
registerRoot(RemotionRoot);
