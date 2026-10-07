// 결과 화면의 사업 행 데이터 조립 (순수 함수). 이름·금액·접수 상태는 사업 데이터와 서버 응답에서만 가져온다.
import { copy } from '../../config/copy';
import type { AnalyzeResponse, Program, ProgramsFile, Recommendation } from '../../services/api.models';

export type ApplyStateValue = Program['apply']['state'];

export interface ResultRow {
  programId: string;
  title: string;
  reason?: string;
  amount?: string;
  amountPrefix?: string;
  state?: ApplyStateValue;
  nextMonth?: number | null;
  statusText?: string;
  /** dataConfidence 가 low 일 때 사업명 아래에 붙는 한 줄 */
  note?: string;
}

export interface ExcludedRow {
  programId: string;
  name: string;
  why: string;
}

export interface ResultRows {
  main: ResultRow[];
  checkup: ResultRow[];
  excluded: ExcludedRow[];
}

/** "내년 3월 전후", "매년 2~3월 모집", "예년 2월" 같은 글에서 처음 나오는 월. 없으면 null. */
export function parseNextMonth(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(\d{1,2})\s*(?:~\s*\d{1,2}\s*)?월/.exec(text);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n : null;
}

function findProgram(programs: ProgramsFile, id: string): Program | undefined {
  return programs.programs.find((p) => p.id === id);
}

/** 추천에 variant 가 있으면 그 variant 의 금액 한 줄, 없으면 사업 금액 한 줄. */
export function amountLine(program: Program, variant?: string | null): string {
  if (variant) {
    const v = program.eligibility.variants?.find((x) => x.id === variant);
    if (v?.amountShort) return v.amountShort;
  }
  return program.amount.short;
}

/** 접수 상태 한 줄. 마감이면 다음 모집 달을 알 수 있을 때만 붙이고, 모르면 데이터의 안내 글을 그대로 쓴다. */
export function statusFields(
  state: ApplyStateValue,
  nextText: string | null | undefined,
): Pick<ResultRow, 'state' | 'nextMonth' | 'statusText'> {
  if (state !== 'closed_next') return { state };
  const nextMonth = parseNextMonth(nextText);
  if (nextMonth) return { state, nextMonth };
  return nextText ? { statusText: nextText } : { state };
}

function mainRow(rec: Recommendation, program: Program): ResultRow {
  return {
    programId: program.id,
    title: program.name,
    reason: rec.reason,
    amount: amountLine(program, rec.variant),
    amountPrefix: program.kind === 'loan' ? copy.results.loanPrefix : undefined,
    ...statusFields(rec.applyState ?? program.apply.state, program.apply.nextText),
    note: program.dataConfidence === 'low' ? copy.results.infoChecking : undefined,
  };
}

export function buildRows(res: AnalyzeResponse, programs: ProgramsFile): ResultRows {
  const main: ResultRow[] = [];
  for (const rec of [...res.recommendations].sort((a, b) => a.rank - b.rank)) {
    const program = findProgram(programs, rec.programId);
    if (program) main.push(mainRow(rec, program));
  }
  const checkup: ResultRow[] = [];
  for (const item of res.checkup) {
    const program = findProgram(programs, item.programId);
    if (program) {
      checkup.push({ programId: program.id, title: program.name });
    }
  }
  const excluded: ExcludedRow[] = [];
  for (const ex of res.excluded) {
    const program = findProgram(programs, ex.programId);
    if (program) excluded.push({ programId: program.id, name: program.name, why: ex.why });
  }
  return { main, checkup, excluded };
}

export type ResultKind = 'confirm' | 'other' | 'empty' | 'list';

/** 결과 화면이 어떤 단계를 보여 줄지. confirmed 는 사용자가 [맞아요]를 눌렀는지. */
export function resultKind(res: AnalyzeResponse, confirmed: boolean, rows: ResultRows): ResultKind {
  if (res.classification.type === 'other') return 'other';
  if (res.needsConfirm && !confirmed) return 'confirm';
  return rows.main.length === 0 && rows.checkup.length === 0 ? 'empty' : 'list';
}
