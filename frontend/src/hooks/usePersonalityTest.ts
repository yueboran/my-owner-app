/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 性格测试状态管理与维度计算 Hook
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_PROFILES,
  type PersonalityResultProfile,
} from '../types/personality';

const STORAGE_RESULT_KEY = 'hk_personality_test_result_v1';

export function usePersonalityTest() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [savedResult, setSavedResult] = useState<PersonalityResultProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RESULT_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse personality result:', e);
    }
    return null;
  });

  const totalQuestions = PERSONALITY_QUESTIONS.length;
  const currentQuestion = PERSONALITY_QUESTIONS[currentStep];

  // 记录答案
  const selectOption = useCallback(
    (questionId: number, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (currentStep < totalQuestions - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // 完成测试
        setTestCompleted(true);
      }
    },
    [currentStep, totalQuestions]
  );

  // 上一题
  const prevQuestion = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // 计算测试得分与最终 MBTI 类型
  const computedResult = useMemo(() => {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    Object.values(answers).forEach((val) => {
      if (val in scores) {
        scores[val as keyof typeof scores] += 1;
      }
    });

    const eOrI = scores.E >= scores.I ? 'E' : 'I';
    const sOrN = scores.S >= scores.N ? 'S' : 'N';
    const tOrF = scores.T >= scores.F ? 'T' : 'F';
    const jOrP = scores.J >= scores.P ? 'J' : 'P';

    const typeCode = `${eOrI}${sOrN}${tOrF}${jOrP}`;
    return {
      typeCode,
      scores,
      profile: PERSONALITY_PROFILES[typeCode] || PERSONALITY_PROFILES.INTJ,
    };
  }, [answers]);

  // 当测试完成时，自动保存最新结果
  useEffect(() => {
    if (testCompleted && computedResult.profile) {
      try {
        localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(computedResult.profile));
        setSavedResult(computedResult.profile);
      } catch (e) {
        console.error('Failed to save personality result:', e);
      }
    }
  }, [testCompleted, computedResult]);

  // 重新测试
  const restartTest = useCallback(() => {
    setAnswers({});
    setCurrentStep(0);
    setTestCompleted(false);
  }, []);

  return {
    currentStep,
    totalQuestions,
    currentQuestion,
    answers,
    testCompleted: testCompleted || (savedResult !== null && Object.keys(answers).length === 0),
    activeProfile: testCompleted ? computedResult.profile : savedResult,
    scores: computedResult.scores,
    selectOption,
    prevQuestion,
    restartTest,
  };
}
