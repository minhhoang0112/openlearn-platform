import React from 'react';
import { ApiWord } from '../api/client';
import { WordLearningDetails } from './WordLearningDetails';

export function WordExample({
  word,
  onChange,
}: {
  word: ApiWord;
  onChange?: (word: ApiWord) => void;
}) {
  return <WordLearningDetails word={word} onChange={onChange} variant="list" />;
}
