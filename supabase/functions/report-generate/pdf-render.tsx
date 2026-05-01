// react-pdf template for the BaZi detailed report.
// IMPORTANT: this file must be tsx (uses JSX). Deno's Edge Function runtime
// supports tsx via the bundler hint at the top of files that consume it.
//
// Font subsetting CI script: scripts/build-font-subset.sh
// Asset path: ./assets/NotoSansSC-Subset.ttf (committed once produced).

/// <reference types="npm:@types/react@18" />

import React from 'npm:react@18.3.1'
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from 'npm:@react-pdf/renderer@3.4.0'

// Register the CJK subset. URL is resolved at runtime relative to this module.
Font.register({
  family: 'NotoSansSC',
  src: new URL('./assets/NotoSansSC-Subset.ttf', import.meta.url).href,
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansSC',
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 50,
    fontSize: 11,
    lineHeight: 1.7,
    color: '#1a1a1a',
  },
  cover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  brand: { fontSize: 14, color: '#888', marginBottom: 60 },
  title: { fontSize: 32, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 6 },
  reportNumber: { marginTop: 80, fontSize: 10, color: '#888' },
  chapterTitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 14,
    paddingBottom: 6,
    borderBottom: '1pt solid #d4d4d4',
  },
  paragraph: { textAlign: 'justify', marginBottom: 10 },
  appendixCode: {
    fontSize: 9,
    color: '#444',
    fontFamily: 'NotoSansSC',
    marginBottom: 6,
  },
  disclaimer: {
    fontSize: 9,
    color: '#666',
    marginTop: 40,
    padding: 14,
    border: '1pt solid #d4d4d4',
    backgroundColor: '#fafafa',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
  },
})

export type ReportPDFProps = {
  reportId: string
  reportType: string
  reportNumber: string
  generatedAt: string // ISO date string
  displayName: string | null
  birthSummary: string // pre-formatted, no PII
  sections: Array<{ id: string; title: string; text: string }>
  chartAppendixText: string
  locale: 'zh-CN' | 'zh-TW' | 'en'
}

const DISCLAIMER_ZH =
  '本报告基于传统命理研究，仅供文化参考与个人探索，不构成医疗、法律、财务、投资或心理咨询建议。'

const DISCLAIMER_EN =
  'This report is based on traditional Chinese metaphysics for educational and entertainment purposes only. It does not constitute medical, legal, financial, or psychological advice.'

function maskName(name: string | null): string {
  if (!name) return '***'
  if (name.length <= 1) return `${name}*`
  return `${name[0]}${'*'.repeat(name.length - 1)}`
}

export function ReportPDF(props: ReportPDFProps) {
  const showEn = props.locale === 'en'
  return (
    <Document
      title={`BaziLens · ${props.reportType}`}
      author="BaziLens"
      subject="Traditional Chinese astrology study report"
    >
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.brand}>BaziLens</Text>
          <Text style={styles.title}>八字一生总论</Text>
          <Text style={styles.subtitle}>命主：{maskName(props.displayName)}</Text>
          <Text style={styles.subtitle}>{props.birthSummary}</Text>
          <Text style={styles.reportNumber}>
            报告编号：{props.reportNumber} · 生成日期：{new Date(props.generatedAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* Chapters */}
      {props.sections.map((sec) => (
        <Page key={sec.id} size="A4" style={styles.page}>
          <Text style={styles.chapterTitle}>{sec.title}</Text>
          {splitParagraphs(sec.text).map((para, i) => (
            <Text key={i} style={styles.paragraph}>
              {para}
            </Text>
          ))}
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      ))}

      {/* Appendix + disclaimer */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.chapterTitle}>附录 · 命盘原始数据</Text>
        <Text style={styles.appendixCode}>{props.chartAppendixText}</Text>
        <View style={styles.disclaimer}>
          <Text>{DISCLAIMER_ZH}</Text>
          {showEn && <Text style={{ marginTop: 8 }}>{DISCLAIMER_EN}</Text>}
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}

function splitParagraphs(text: string): string[] {
  // Markdown-ish: blank line separates paragraphs. Strip trailing whitespace.
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
