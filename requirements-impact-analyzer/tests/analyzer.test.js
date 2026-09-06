import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRequirements, analysisToCsv, analysisToMarkdown, analyzerInternals } from '../lib/analyzer.js';
const before=`
注文登録画面で顧客名、商品、数量を入力する。
登録済み注文は担当者のみ編集できる。
注文確定時に在庫数を更新する。
処理結果は画面に表示する。`;
const after=`
注文登録画面で顧客名、商品、数量、希望納期を入力する。希望納期は必須とする。
登録済み注文は担当者と管理者が編集でき、変更履歴を保存する。
注文確定時に在庫数を更新し、在庫不足の場合はSlackへ通知する。
一度確定した注文の削除は管理者のみ実行でき、監査ログを保持する。
処理結果は3秒以内に画面に表示する。`;
test('変更点と影響領域を抽出できる',()=>{const r=analyzeRequirements({projectName:'受注管理刷新',oldText:before,newText:after});assert.ok(r.summary.changeCount>=4);assert.ok(r.summary.impactedAreaCount>=5);assert.ok(r.tasks.length>r.changes.length);});
test('権限・DB・通知・性能の影響を検知できる',()=>{const r=analyzeRequirements({oldText:before,newText:after});const ids=new Set(r.impactSummary.map(x=>x.id));['auth','data','notification','performance'].forEach(id=>assert.ok(ids.has(id)));});
test('新規要件だけでも追加変更として扱える',()=>{const r=analyzeRequirements({oldText:'',newText:'管理者は利用者を一括登録できる。'});assert.equal(r.summary.typeCounts.added,1);assert.equal(r.changes[0].type,'added');});
test('同一文章は変更なしになる',()=>{const r=analyzeRequirements({oldText:before,newText:before});assert.equal(r.summary.changeCount,0);assert.equal(r.summary.overallRisk.score,0);});
test('MarkdownとCSVを出力できる',()=>{const r=analyzeRequirements({projectName:'受注管理刷新',oldText:before,newText:after});assert.match(analysisToMarkdown(r),/要件変更影響分析/);assert.match(analysisToCsv(r),/変更ID/);});
test('類似度は同じ文ほど高い',()=>{const same=analyzerInternals.textSimilarity('顧客名を表示する','顧客名を表示する');const different=analyzerInternals.textSimilarity('顧客名を表示する','夜間バッチを停止する');assert.ok(same>different);});
