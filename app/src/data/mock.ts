import type { AppState, Company, Contact, CompanyTask } from '../types'

// Тестовые данные для интерактивного прототипа.
// Сегмент — пищепром, как в примерах ТЗ (лист «Контакты — пищепром»).

const now = new Date('2026-08-10T09:00:00')
const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000))
const inDays = (n: number) => iso(new Date(now.getTime() + n * 86400000))

const company = (p: Partial<Company> & Pick<Company, 'id' | 'ext_no' | 'name' | 'priority' | 'segment' | 'funnel_stage'>): Company => ({
  category: 'Производство',
  geography: 'Москва',
  why_fit: '',
  signal_note: '',
  relevant_hypothesis_text: '',
  what_to_check: '',
  who_to_find: '',
  extended_reason: '',
  first_message_template: '',
  second_message_template: '',
  is_excluded: false,
  excluded_reason: '',
  revenue_amount: 0,
  created_at: daysAgo(30),
  last_activity_at: daysAgo(30),
  ...p,
})

const companies: Company[] = [
  company({
    id: 'c1', ext_no: '1', name: 'ГК «Свежий колос»', priority: 'A', segment: 'Хлебопечение',
    geography: 'Москва', funnel_stage: 'met', last_activity_at: daysAgo(3),
    why_fit: 'Крупная сеть пекарен, активно масштабируется в регионы.',
    signal_note: 'Открыли 4 новых точки за квартал, ищут поставщика заквасок.',
    relevant_hypothesis_text: 'Натуральная закваска сократит возвраты на 15%.',
    what_to_check: 'Кто отвечает за закупку сырья, объёмы.',
    who_to_find: 'Директор по производству',
    extended_reason: 'Пост в отраслевом канале про рост возвратов чёрствого хлеба.',
    first_message_template: 'Здравствуйте! Видели ваш рост по точкам…',
    second_message_template: 'Прикладываю кейс по снижению возвратов…',
  }),
  company({
    id: 'c2', ext_no: '2', name: 'ООО «Молочные реки»', priority: 'A', segment: 'Молочка',
    geography: 'Тверь', funnel_stage: 'touched', last_activity_at: daysAgo(9),
    why_fit: 'Средний завод, обновляют линейку йогуртов.',
    signal_note: 'Вакансия технолога по ферментам — сигнал к смене рецептур.',
    relevant_hypothesis_text: 'Пробиотические культуры зайдут в премиум-линейку.',
    who_to_find: 'Главный технолог',
    first_message_template: 'Здравствуйте! По поводу обновления линейки…',
  }),
  company({
    id: 'c3', ext_no: '3', name: 'АО «Мясной двор»', priority: 'B', segment: 'Мясопереработка',
    geography: 'Калуга', funnel_stage: 'in_work', last_activity_at: daysAgo(14),
    why_fit: 'Ищут замену импортным оболочкам.',
    signal_note: 'Тендер на упаковочные материалы.',
    who_to_find: 'Снабжение',
  }),
  company({
    id: 'c4', ext_no: '4', name: 'ООО «Кондитер+»', priority: 'A', segment: 'Кондитерка',
    geography: 'Москва', funnel_stage: 'agreement', last_activity_at: daysAgo(2),
    why_fit: 'Премиальный сегмент, высокая маржа.',
    signal_note: 'Запускают линию без сахара.',
    relevant_hypothesis_text: 'Натуральные подсластители зайдут в ЗОЖ-линейку.',
  }),
  company({
    id: 'c5', ext_no: '5', name: 'ГК «АгроВолга»', priority: 'B', segment: 'Бакалея',
    geography: 'Самара', funnel_stage: 'revenue', last_activity_at: daysAgo(20),
    revenue_amount: 480000,
    why_fit: 'Вертикально интегрированный холдинг.',
    signal_note: 'Расширяют ассортимент круп.',
  }),
  company({
    id: 'c6', ext_no: '6', name: 'ООО «Снек-Мастер»', priority: 'C', segment: 'Снеки',
    geography: 'Рязань', funnel_stage: 'new_signal',
    why_fit: 'Молодой бренд чипсов, растёт в маркетплейсах.',
    signal_note: 'Активный рост продаж на WB.',
  }),
  company({
    id: 'c7', ext_no: '7', name: 'АО «СольПром»', priority: 'C', segment: 'Приправы',
    geography: 'Тула', funnel_stage: 'new_signal',
    why_fit: 'Ищут дистрибьюторов на юг.',
    signal_note: 'Пост о выходе в новые регионы.',
  }),
  company({
    id: 'c8', ext_no: '8', name: 'ООО «Пекарь-Люкс»', priority: 'B', segment: 'Хлебопечение',
    geography: 'Ярославль', funnel_stage: 'rejected',
    is_excluded: false,
    why_fit: 'Малый объём, не наш профиль.',
    signal_note: 'Отклонён на отвесе — слишком мелкий.',
  }),
]

const contact = (p: Partial<Contact> & Pick<Contact, 'id' | 'company_id' | 'ext_company_no' | 'company_name' | 'contact_no' | 'full_name'>): Contact => ({
  priority: 'A', segment: '', role_target: 'ЛПР по закупкам', position: '', phone: '', email: '',
  telegram: '', tenchat: '', network: '', linkedin: '', other_social: '', source: 'LinkedIn',
  last_digital_trace: '', last_trace_date: '', check_date: daysAgo(5), confidence: 'высокая',
  comment: '', how_to_get: '', ...p,
})

const contacts: Contact[] = [
  contact({ id: 'k1', company_id: 'c1', ext_company_no: '1', company_name: 'ГК «Свежий колос»', contact_no: '1', full_name: 'Игорь Соколов', position: 'Директор по производству', phone: '+7 916 000-11-22', email: 'sokolov@koloshleb.ru', telegram: '@sokolov_prod', confidence: 'высокая', comment: 'Принимает решения по сырью.' }),
  contact({ id: 'k2', company_id: 'c1', ext_company_no: '1', company_name: 'ГК «Свежий колос»', contact_no: '2', full_name: 'Анна Мельник', position: 'Технолог', email: 'melnik@koloshleb.ru', confidence: 'средняя', role_target: 'Влияет на выбор' }),
  contact({ id: 'k3', company_id: 'c2', ext_company_no: '2', company_name: 'ООО «Молочные реки»', contact_no: '1', full_name: 'Дмитрий Ершов', position: 'Главный технолог', telegram: '@ershov_milk', confidence: 'высокая' }),
  contact({ id: 'k4', company_id: 'c3', ext_company_no: '3', company_name: 'АО «Мясной двор»', contact_no: '1', full_name: 'Ольга Панова', position: 'Руководитель снабжения', phone: '+7 920 555-33-44', confidence: 'средняя' }),
  contact({ id: 'k5', company_id: 'c4', ext_company_no: '4', company_name: 'ООО «Кондитер+»', contact_no: '1', full_name: 'Сергей Ким', position: 'Коммерческий директор', email: 'kim@konditerplus.ru', linkedin: 'in/sergeykim', confidence: 'высокая' }),
  contact({ id: 'k6', company_id: 'c5', ext_company_no: '5', company_name: 'ГК «АгроВолга»', contact_no: '1', full_name: 'Наталья Гринь', position: 'Директор по закупкам', phone: '+7 927 111-22-33', confidence: 'высокая' }),
  // unmatched: № компании нет в базе компаний
  contact({ id: 'k7', company_id: null, ext_company_no: '99', company_name: 'ООО «Ферма-Юг»', contact_no: '1', full_name: 'Павел Дуб', position: 'Владелец', confidence: 'низкая', how_to_get: 'Компания не найдена в базе — проверить № компании.' }),
]

// Задачи, формирующие метрики и стадии.
const tasks: CompanyTask[] = [
  // c4 (agreement): analyze + касание + встреча + договорённость (все done) + открытый next step
  { id: 't1', company_id: 'c4', title: 'Разобрать сигнал', description: 'Линия без сахара', type: 'analyze_signal', status: 'done', result_note: 'Идём с натуральными подсластителями.', is_next_step: false, due_at: null, created_at: daysAgo(18), completed_at: daysAgo(17) },
  { id: 't2', company_id: 'c4', title: 'Первое сообщение Сергею', description: '', type: 'touch_new', status: 'done', result_note: 'Ответил, интересно.', is_next_step: true, due_at: null, created_at: daysAgo(16), completed_at: daysAgo(14) },
  { id: 't3', company_id: 'c4', title: 'Встреча-презентация', description: '', type: 'meeting_new', status: 'done', result_note: 'Хорошо пообщались, запросили КП.', is_next_step: true, due_at: null, created_at: daysAgo(13), completed_at: daysAgo(6) },
  { id: 't4', company_id: 'c4', title: 'Согласовать пилот', description: 'Пилотная партия', type: 'agreement', status: 'done', result_note: 'Договорились о пилоте на 1 месяц.', is_next_step: true, due_at: null, created_at: daysAgo(5), completed_at: daysAgo(2) },
  { id: 't5', company_id: 'c4', title: 'Согласовать договор пилота', description: '', type: 'custom', status: 'waiting', result_note: '', is_next_step: true, due_at: inDays(4), created_at: daysAgo(2), completed_at: null },

  // c1 (met): analyze + касание + встреча done, открытый повторный шаг
  { id: 't6', company_id: 'c1', title: 'Разобрать сигнал', description: '', type: 'analyze_signal', status: 'done', result_note: 'Заквасочный продукт под возвраты.', is_next_step: false, due_at: null, created_at: daysAgo(20), completed_at: daysAgo(19) },
  { id: 't7', company_id: 'c1', title: 'Первое сообщение Игорю', description: '', type: 'touch_new', status: 'done', result_note: 'Ответил через день.', is_next_step: true, due_at: null, created_at: daysAgo(18), completed_at: daysAgo(15) },
  { id: 't8', company_id: 'c1', title: 'Онлайн-встреча', description: '', type: 'meeting_new', status: 'done', result_note: 'Запросили образцы.', is_next_step: true, due_at: null, created_at: daysAgo(12), completed_at: daysAgo(3) },
  { id: 't9', company_id: 'c1', title: 'Отправить образцы и написать', description: '', type: 'touch_repeat', status: 'planned', result_note: '', is_next_step: true, due_at: inDays(2), created_at: daysAgo(3), completed_at: null },

  // c2 (touched): analyze + касание done, ПРОСРОЧЕННЫЙ повторный шаг (демо фокуса)
  { id: 't10', company_id: 'c2', title: 'Разобрать сигнал', description: '', type: 'analyze_signal', status: 'done', result_note: 'Пробиотики в премиум.', is_next_step: false, due_at: null, created_at: daysAgo(15), completed_at: daysAgo(14) },
  { id: 't11', company_id: 'c2', title: 'Первое сообщение Дмитрию', description: '', type: 'touch_new', status: 'done', result_note: 'Прочитал, не ответил.', is_next_step: true, due_at: null, created_at: daysAgo(12), completed_at: daysAgo(9) },
  { id: 't12', company_id: 'c2', title: 'Повторное касание — напоминание', description: '', type: 'touch_repeat', status: 'waiting', result_note: '', is_next_step: true, due_at: daysAgo(2), created_at: daysAgo(9), completed_at: null },

  // c3 (in_work): analyze завершён, НЕТ открытой задачи — «зависла» (демо фокуса)
  { id: 't13', company_id: 'c3', title: 'Разобрать сигнал', description: 'Тендер на оболочки', type: 'analyze_signal', status: 'done', result_note: 'Идём с заменой импортных оболочек.', is_next_step: false, due_at: null, created_at: daysAgo(14), completed_at: daysAgo(12) },

  // c5 (revenue): полный путь + оплата
  { id: 't14', company_id: 'c5', title: 'Разобрать сигнал', description: '', type: 'analyze_signal', status: 'done', result_note: '', is_next_step: false, due_at: null, created_at: daysAgo(40), completed_at: daysAgo(38) },
  { id: 't15', company_id: 'c5', title: 'Первое сообщение', description: '', type: 'touch_new', status: 'done', result_note: '', is_next_step: true, due_at: null, created_at: daysAgo(37), completed_at: daysAgo(35) },
  { id: 't16', company_id: 'c5', title: 'Встреча', description: '', type: 'meeting_new', status: 'done', result_note: '', is_next_step: true, due_at: null, created_at: daysAgo(33), completed_at: daysAgo(30) },
  { id: 't17', company_id: 'c5', title: 'Договор поставки', description: '', type: 'agreement', status: 'done', result_note: 'Подписали.', is_next_step: true, due_at: null, created_at: daysAgo(28), completed_at: daysAgo(22) },
]

export const initialState: AppState = {
  strategy: {
    id: 's1',
    name: 'Выход в пищепром ЦФО',
    quarter: '2026-Q3',
    created_at: daysAgo(45),
  },
  kpiTargets: [
    { id: 'kt1', strategy_id: 's1', kpi_key: 'new_touches', unit: 'шт.', plan_value: 40, prev_q_value: 22 },
    { id: 'kt2', strategy_id: 's1', kpi_key: 'new_meetings', unit: 'шт.', plan_value: 12, prev_q_value: 7 },
    { id: 'kt3', strategy_id: 's1', kpi_key: 'repeat_meetings', unit: 'шт.', plan_value: 8, prev_q_value: 5 },
    { id: 'kt4', strategy_id: 's1', kpi_key: 'agreements', unit: 'шт.', plan_value: 5, prev_q_value: 2 },
    { id: 'kt5', strategy_id: 's1', kpi_key: 'revenue', unit: 'руб.', plan_value: 2000000, prev_q_value: 750000 },
  ],
  hypotheses: [
    { id: 'h1', strategy_id: 's1', title: 'Натуральная закваска снижает возвраты хлеба', description: 'Пекарни с высоким % возвратов чёрствого хлеба заинтересуются заквасками, продлевающими свежесть.', is_active: true, created_at: daysAgo(40) },
    { id: 'h2', strategy_id: 's1', title: 'Пробиотики зайдут в премиум-молочку', description: 'Средние молочные заводы, обновляющие линейку, возьмут пробиотические культуры для премиум-сегмента.', is_active: true, created_at: daysAgo(35) },
    { id: 'h3', strategy_id: 's1', title: 'Натуральные подсластители для ЗОЖ-кондитерки', description: 'Кондитеры, запускающие линейки без сахара, ищут натуральные подсластители.', is_active: false, created_at: daysAgo(20) },
  ],
  hypTasks: [
    { id: 'ht1', hypothesis_id: 'h1', title: 'Провести 10 касаний по пекарням', description: '', sort_order: 1 },
    { id: 'ht2', hypothesis_id: 'h1', title: 'Собрать 3 встречи с технологами', description: '', sort_order: 2 },
    { id: 'ht3', hypothesis_id: 'h2', title: 'Провести 8 касаний по молочке', description: '', sort_order: 1 },
    { id: 'ht4', hypothesis_id: 'h3', title: 'Проверить интерес 5 кондитеров', description: '', sort_order: 1 },
  ],
  hypSubtasks: [
    // ht1 — 10 касаний, 6 done
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `hs1_${i + 1}`, hyp_task_id: 'ht1', title: `Касание ${i + 1}`, is_done: i < 6, sort_order: i + 1,
    })),
    // ht2 — 3 встречи, 1 done
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `hs2_${i + 1}`, hyp_task_id: 'ht2', title: `Встреча ${i + 1}`, is_done: i < 1, sort_order: i + 1,
    })),
    // ht3 — 8 касаний, 3 done
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `hs3_${i + 1}`, hyp_task_id: 'ht3', title: `Касание ${i + 1}`, is_done: i < 3, sort_order: i + 1,
    })),
    // ht4 — 5 проверок, 0 done
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `hs4_${i + 1}`, hyp_task_id: 'ht4', title: `Кондитер ${i + 1}`, is_done: false, sort_order: i + 1,
    })),
  ],
  companies,
  contacts,
  tasks,
}
