const RULES = [
  { id: 'ui', label: '画面・UI', shortLabel: 'UI', team: 'フロントエンド', keywords: ['画面','表示','入力','フォーム','ボタン','一覧','詳細','検索','選択','項目','メニュー','レイアウト','ui','ux'], artifacts: ['画面設計書','UIコンポーネント','入力バリデーション'], tests: ['表示確認','入力境界値','レスポンシブ確認'], hours: 5 },
  { id: 'api', label: 'API・外部連携', shortLabel: 'API', team: 'バックエンド', keywords: ['api','エンドポイント','リクエスト','レスポンス','連携','webhook','外部','送信','受信','同期','取得'], artifacts: ['API仕様書','入出力スキーマ','エラーハンドリング'], tests: ['API契約テスト','異常系テスト','連携疎通'], hours: 7 },
  { id: 'data', label: 'DB・データ', shortLabel: 'DB', team: 'データ・バックエンド', keywords: ['db','データベース','テーブル','カラム','項目','保存','履歴','ステータス','マスタ','データ','移行','保持','削除','集計','検索条件'], artifacts: ['ER図','テーブル定義','データ移行計画'], tests: ['CRUD確認','移行リハーサル','整合性確認'], hours: 8 },
  { id: 'auth', label: '認証・権限', shortLabel: 'AUTH', team: 'セキュリティ', keywords: ['認証','ログイン','権限','ロール','管理者','承認者','閲覧制限','アクセス','暗号','個人情報','監査ログ'], artifacts: ['権限マトリクス','認証フロー','セキュリティ設計'], tests: ['権限別テスト','不正アクセス確認','監査ログ確認'], hours: 9 },
  { id: 'notification', label: '通知・メッセージ', shortLabel: '通知', team: 'バックエンド', keywords: ['通知','メール','slack','line','sms','メッセージ','リマインド','アラート','再送'], artifacts: ['通知テンプレート','配信条件','再送制御'], tests: ['通知条件確認','テンプレート確認','重複配信確認'], hours: 5 },
  { id: 'batch', label: 'バッチ・ジョブ', shortLabel: 'BATCH', team: 'バックエンド', keywords: ['バッチ','定期','毎日','毎月','締め','夜間','cron','ジョブ','自動実行','一括','スケジュール'], artifacts: ['ジョブ設計','実行スケジュール','リカバリ手順'], tests: ['再実行確認','多重起動確認','障害復旧確認'], hours: 7 },
  { id: 'performance', label: '性能・可用性', shortLabel: '性能', team: '基盤・SRE', keywords: ['性能','秒以内','同時','負荷','レスポンス','可用性','冗長','キャッシュ','タイムアウト','大量','ピーク'], artifacts: ['非機能要件','性能試験計画','監視設計'], tests: ['負荷テスト','ピーク試験','フェイルオーバー確認'], hours: 8 },
  { id: 'operation', label: '運用・監視', shortLabel: '運用', team: '運用・SRE', keywords: ['運用','監視','ログ','障害','問い合わせ','手動','管理画面','エラー','復旧','バックアップ','保守'], artifacts: ['運用手順書','監視項目','障害対応フロー'], tests: ['運用リハーサル','アラート確認','復旧訓練'], hours: 5 },
  { id: 'test', label: 'テスト・品質', shortLabel: 'TEST', team: 'QA', keywords: ['テスト','受入','品質','検証','確認','ケース','期待結果','バグ','不具合'], artifacts: ['テスト計画','テストケース','受入基準'], tests: ['回帰テスト','受入テスト','探索的テスト'], hours: 7 },
  { id: 'document', label: '文書・教育', shortLabel: 'DOC', team: 'PMO・業務', keywords: ['マニュアル','手順書','仕様書','規約','ヘルプ','説明','教育','研修','faq','ドキュメント'], artifacts: ['要件定義書','操作マニュアル','リリースノート'], tests: ['文書レビュー','手順トレース','利用者確認'], hours: 3 }
];

const HIGH = ['削除','必須','権限','認証','個人情報','決済','金額','請求','移行','外部連携','一括','全件','監査','暗号','法令','停止','障害','締め','本番','即時'];
const MEDIUM = ['変更','追加','更新','通知','履歴','検索','ステータス','承認','表示','入力','api','データ','バッチ','管理者','自動'];
const normalize = (value = '') => value.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function splitUnits(text) {
  return normalize(text).split('\n').map(line => line.replace(/^[-*・●■□\d０-９]+[.)．、:\s-]*/, '').trim()).filter(Boolean);
}

function tokens(text) {
  const compact = normalize(text).toLowerCase();
  const values = compact.match(/[a-z0-9_-]{2,}|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]{2,}/gu) || [];
  return new Set(values.flatMap(value => value.length <= 4 ? [value] : [value, ...Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2))]));
}

function textSimilarity(left, right) {
  const a = normalize(left).toLowerCase();
  const b = normalize(right).toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;
  const ta = tokens(a), tb = tokens(b);
  let intersection = 0;
  ta.forEach(token => { if (tb.has(token)) intersection += 1; });
  const jaccard = intersection / Math.max(1, ta.size + tb.size - intersection);
  const length = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return Math.min(1, jaccard * 0.75 + length * 0.1 + ((a.includes(b) || b.includes(a)) ? 0.15 : 0));
}

function detectChanges(oldText, newText) {
  const before = splitUnits(oldText), after = splitUnits(newText);
  if (normalize(oldText) === normalize(newText)) return [];
  const used = new Set(), changes = [];
  before.forEach((item, oldIndex) => {
    let best = null;
    after.forEach((candidate, newIndex) => {
      if (used.has(newIndex)) return;
      const score = textSimilarity(item, candidate);
      if (!best || score > best.score) best = { newIndex, score };
    });
    if (best && best.score >= 0.2) {
      used.add(best.newIndex);
      if (item !== after[best.newIndex]) changes.push({ type: 'modified', before: item, after: after[best.newIndex], similarity: best.score, order: best.newIndex });
    } else {
      changes.push({ type: 'removed', before: item, after: '', similarity: 0, order: oldIndex + 0.2 });
    }
  });
  after.forEach((item, index) => { if (!used.has(index)) changes.push({ type: 'added', before: '', after: item, similarity: 0, order: index + 0.5 }); });
  return changes.sort((a, b) => a.order - b.order).map((change, index) => ({ ...change, id: `CHG-${String(index + 1).padStart(3, '0')}` }));
}

const hits = (text, words) => words.filter(word => text.toLowerCase().includes(word.toLowerCase()));

function classify(change) {
  const text = `${change.before} ${change.after}`;
  const impacts = RULES.map(rule => {
    const matched = hits(text, rule.keywords);
    return matched.length ? { ...rule, hits: matched, confidence: Math.min(98, 54 + matched.length * 11) } : null;
  }).filter(Boolean);
  if (!impacts.length) impacts.push({ ...RULES[0], hits: [], confidence: 44 });
  for (const id of ['test', 'document']) if (!impacts.some(item => item.id === id)) impacts.push({ ...RULES.find(rule => rule.id === id), hits: [], confidence: id === 'test' ? 48 : 40 });
  return impacts.sort((a, b) => b.confidence - a.confidence);
}

function riskFor(change, impacts) {
  const text = `${change.before} ${change.after}`;
  const highHits = hits(text, HIGH), mediumHits = hits(text, MEDIUM);
  const base = change.type === 'removed' ? 36 : change.type === 'modified' ? 30 : 22;
  const score = Math.min(100, Math.round(base + highHits.length * 12 + mediumHits.length * 4 + Math.max(0, impacts.length - 2) * 5));
  return { score, severity: score >= 68 ? 'high' : score >= 40 ? 'medium' : 'low', highHits, mediumHits };
}

const summaryText = change => `${change.type === 'added' ? '追加' : change.type === 'removed' ? '削除' : '変更'}：${(change.after || change.before).replace(/\s+/g, ' ').slice(0, 58)}${(change.after || change.before).length > 58 ? '…' : ''}`;

export function analyzeRequirements({ projectName = '名称未設定プロジェクト', oldText = '', newText = '', releaseDate = '' } = {}) {
  const changes = detectChanges(oldText, newText).map(change => {
    const impacts = classify(change), risk = riskFor(change, impacts);
    return { ...change, impacts, risk, summary: summaryText(change) };
  });
  const impactSummary = RULES.map(rule => {
    const related = changes.filter(change => change.impacts.some(impact => impact.id === rule.id));
    const risk = related.length ? Math.round(related.reduce((sum, change) => sum + change.risk.score, 0) / related.length) : 0;
    return { ...rule, count: related.length, changeIds: related.map(change => change.id), risk, strength: Math.min(100, related.length * 22 + risk * 0.55) };
  }).filter(item => item.count).sort((a, b) => b.strength - a.strength);
  const tasks = [];
  changes.forEach(change => change.impacts.forEach(impact => tasks.push({ id: `TSK-${String(tasks.length + 1).padStart(3, '0')}`, changeId: change.id, impactId: impact.id, title: `${impact.label}：${change.type === 'added' ? '追加設計を反映' : change.type === 'removed' ? '廃止影響を確認' : '変更設計を反映'}`, owner: impact.team, estimateHours: Math.max(2, Math.round(impact.hours * (change.risk.severity === 'high' ? 1.8 : change.risk.severity === 'medium' ? 1.25 : 0.8))), priority: change.risk.severity, deliverable: impact.artifacts[0], acceptance: impact.tests[0] })));
  const typeCounts = changes.reduce((value, change) => ({ ...value, [change.type]: value[change.type] + 1 }), { added: 0, modified: 0, removed: 0 });
  const average = changes.length ? changes.reduce((sum, change) => sum + change.risk.score, 0) / changes.length : 0;
  const highRiskCount = changes.filter(change => change.risk.severity === 'high').length;
  const overallScore = changes.length ? Math.min(100, Math.round(average + highRiskCount * 6 + Math.min(14, changes.length * 1.5))) : 0;
  const overallRisk = { score: overallScore, severity: overallScore >= 68 ? 'high' : overallScore >= 40 ? 'medium' : 'low', label: !changes.length ? '変更なし' : overallScore >= 68 ? '高リスク' : overallScore >= 40 ? '要注意' : '低リスク' };
  const totalHours = tasks.reduce((sum, task) => sum + task.estimateHours, 0);
  const riskDimensions = [
    ['scope','影響範囲',Math.min(100, impactSummary.length * 8 + changes.length * 5)],
    ['data','データ',impactSummary.find(item => item.id === 'data')?.risk || 0],
    ['security','セキュリティ',impactSummary.find(item => item.id === 'auth')?.risk || 0],
    ['integration','外部連携',Math.max(impactSummary.find(item => item.id === 'api')?.risk || 0, impactSummary.find(item => item.id === 'notification')?.risk || 0)],
    ['operation','運用',Math.max(impactSummary.find(item => item.id === 'operation')?.risk || 0, impactSummary.find(item => item.id === 'batch')?.risk || 0)],
    ['schedule','工期',Math.min(100, Math.round(average * 0.58 + overallScore * 0.32 + changes.length * 2))]
  ].map(([id, label, value]) => ({ id, label, value: Math.round(value) }));
  const recommendations = [];
  if (highRiskCount) recommendations.push(`${highRiskCount}件の高リスク変更を、実装着手前の設計レビュー対象に固定してください。`);
  if (impactSummary.some(item => item.id === 'auth')) recommendations.push('権限マトリクスを先に更新し、ロール別の否定ケースを追加してください。');
  if (impactSummary.some(item => item.id === 'data')) recommendations.push('既存データへの適用方針とロールバック手順を設計レビューに含めてください。');
  if (impactSummary.some(item => item.id === 'notification')) recommendations.push('通知の重複送信・再送・配信停止条件をテスト観点に追加してください。');
  if (impactSummary.some(item => item.id === 'performance')) recommendations.push('変更後のピーク件数で性能目標を満たすか、負荷試験を計画してください。');
  if (!recommendations.length) recommendations.push('関連テストとリリースノートの更新を完了条件にしてください。');
  const traceability = changes.map((change, changeIndex) => ({ changeId: change.id, summary: change.summary, severity: change.risk.severity, links: change.impacts.map((impact, impactIndex) => ({ impactId: impact.id, impactLabel: impact.label, artifact: impact.artifacts[(changeIndex + impactIndex) % impact.artifacts.length], testCase: `${impact.id.toUpperCase()}-TC-${String(changeIndex + 1).padStart(2, '0')}`, owner: impact.team })) }));
  return { meta: { projectName: normalize(projectName) || '名称未設定プロジェクト', releaseDate, analyzedAt: new Date().toISOString(), engine: 'Local Impact Engine 1.0', privacy: 'browser-only' }, input: { oldText: normalize(oldText), newText: normalize(newText), oldUnitCount: splitUnits(oldText).length, newUnitCount: splitUnits(newText).length }, summary: { changeCount: changes.length, highRiskCount, mediumRiskCount: changes.filter(change => change.risk.severity === 'medium').length, lowRiskCount: changes.filter(change => change.risk.severity === 'low').length, impactedAreaCount: impactSummary.length, taskCount: tasks.length, totalHours, estimatedDays: Math.ceil(totalHours / 8), typeCounts, overallRisk }, changes, impactSummary, tasks, traceability, riskDimensions, recommendations: recommendations.slice(0, 5) };
}

export function analysisToMarkdown(analysis) {
  return [`# ${analysis.meta.projectName} 要件変更影響分析`, '', `- 総合リスク: ${analysis.summary.overallRisk.label} (${analysis.summary.overallRisk.score}/100)`, `- 変更件数: ${analysis.summary.changeCount}件`, `- 影響領域: ${analysis.summary.impactedAreaCount}領域`, `- 対応タスク: ${analysis.summary.taskCount}件 / 約${analysis.summary.totalHours}時間`, '', '## 推奨アクション', ...analysis.recommendations.map(item => `- ${item}`), '', '## 変更一覧', ...analysis.changes.map(change => `- ${change.id} [${change.risk.score}] ${change.summary}`), '', '## 対応タスク', ...analysis.tasks.map(task => `- [ ] ${task.id} ${task.title}（${task.owner} / ${task.estimateHours}h / ${task.changeId}）`)].join('\n');
}

export function analysisToCsv(analysis) {
  const rows = [['変更ID','変更種別','リスク','スコア','変更概要','影響領域','担当チーム','推定時間']];
  analysis.changes.forEach(change => change.impacts.forEach(impact => { const task = analysis.tasks.find(item => item.changeId === change.id && item.impactId === impact.id); rows.push([change.id, change.type, change.risk.severity, change.risk.score, change.summary, impact.label, impact.team, task?.estimateHours || 0]); }));
  const escape = value => `"${String(value).replace(/"/g, '""')}"`;
  return `\uFEFF${rows.map(row => row.map(escape).join(',')).join('\n')}`;
}

export const analyzerInternals = { splitUnits, textSimilarity, detectChanges, classifyImpacts: classify, calculateChangeRisk: riskFor, IMPACT_RULES: RULES };
