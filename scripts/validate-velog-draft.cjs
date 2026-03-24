#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/validate-velog-draft.cjs <file>');
  process.exit(2);
}

const absPath = path.resolve(filePath);
if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(2);
}

const text = fs.readFileSync(absPath, 'utf8');
const errors = [];
const disclaimer = '> _이 글은 하루 동안 진행한 작업을 AI로 정리한 초안을 바탕으로, 사람이 검수·수정해 게시하는 기록입니다._';
const strippedText = text.replace(/(^|\n)(`{3,})[\s\S]*?\n\2/g, '\n[CODE_BLOCK]\n');

const placeholderMatches = strippedText.match(/\{\{[^}]+\}\}/g) || [];
if (placeholderMatches.length > 0) {
  errors.push(`Unresolved placeholders found: ${placeholderMatches.join(', ')}`);
}

if (!strippedText.startsWith('# ')) {
  errors.push('Document must start with a level-1 title.');
}

const hashtagLine = strippedText.split('\n').find(line => line.startsWith('#OpenClaw'));
if (!hashtagLine) {
  errors.push('Missing hashtag line starting with #OpenClaw.');
}

const summaryMatches = strippedText.match(/^## 한줄 요약$/gm) || [];
if (summaryMatches.length !== 1) {
  errors.push(`Expected exactly one '## 한줄 요약' section, found ${summaryMatches.length}.`);
}

const summarySectionMatch = strippedText.match(/^## 한줄 요약\n+(.+?)(\n## |$)/ms);
if (!summarySectionMatch || !summarySectionMatch[1].trim()) {
  errors.push('한줄 요약 section is missing content.');
}

const escapedDisclaimer = disclaimer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const disclaimerMatches = strippedText.match(new RegExp(escapedDisclaimer, 'g')) || [];
if (disclaimerMatches.length === 0) {
  errors.push('Missing disclaimer block.');
} else if (!strippedText.trim().endsWith(disclaimer)) {
  errors.push('Disclaimer must appear at the very end of the document.');
}

const requiredSections = ['## 배경', '## 문제', '## 변경 내용', '## 핵심 설정 / 코드', '## 결과', '## 정리'];
for (const section of requiredSections) {
  if (!strippedText.includes(section)) {
    errors.push(`Missing required section: ${section}`);
  }
}

const fenceCount = (text.match(/(^|\n)```+/g) || []).length;
if (fenceCount % 2 !== 0) {
  errors.push('Unbalanced fenced code blocks detected.');
}

if (errors.length > 0) {
  console.error(`VELOG_DRAFT_INVALID: ${path.basename(filePath)}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`VELOG_DRAFT_VALID: ${path.basename(filePath)}`);
