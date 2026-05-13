import { createContext, useContext, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'hy', label: 'HY' },
]

const translations = {
  en: {
    appName: 'TaskFlow',
    appSub: 'Omni-Channel',
    live: 'Live',
    offline: 'Offline',
    newTask: 'New Task',
    workspace: 'Workspace',
    workspaceId: 'Workspace ID',
    copyToken: 'Copy workspace ID',
    changeWorkspace: 'Change workspace',
    total: 'Total',
    loading: 'Loading tasks...',
    noTasksPage: 'No tasks yet. Create one or send a message to the bot.',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    noTasksCol: 'No tasks',
    srcTelegram: 'Telegram',
    srcVoice: 'Voice',
    srcWeb: 'Web',
    moveBack: 'Move back',
    moveForward: 'Move forward',
    deleteConfirm: (title) => `Delete "${title}"?`,
    modalTitle: 'Create Task',
    titleLabel: 'Title',
    titlePlaceholder: 'What needs to be done?',
    descLabel: 'Description',
    descPlaceholder: 'Add details (optional)',
    statusLabel: 'Status',
    titleRequired: 'Title is required',
    createError: 'Failed to create task. Please try again.',
    cancel: 'Cancel',
    creating: 'Creating...',
    create: 'Create Task',
  },
  ru: {
    appName: 'TaskFlow',
    appSub: 'Мультиканал',
    live: 'Онлайн',
    offline: 'Оффлайн',
    newTask: 'Новая задача',
    workspace: 'Пространство',
    workspaceId: 'ID пространства',
    copyToken: 'Скопировать ID',
    changeWorkspace: 'Сменить пространство',
    total: 'Всего',
    loading: 'Загрузка...',
    noTasksPage: 'Нет задач. Создайте или напишите боту.',
    pending: 'Ожидание',
    inProgress: 'В процессе',
    completed: 'Завершено',
    noTasksCol: 'Нет задач',
    srcTelegram: 'Telegram',
    srcVoice: 'Голос',
    srcWeb: 'Веб',
    moveBack: 'Назад',
    moveForward: 'Вперёд',
    deleteConfirm: (title) => `Удалить "${title}"?`,
    modalTitle: 'Создать задачу',
    titleLabel: 'Заголовок',
    titlePlaceholder: 'Что нужно сделать?',
    descLabel: 'Описание',
    descPlaceholder: 'Добавить описание (необязательно)',
    statusLabel: 'Статус',
    titleRequired: 'Введите заголовок',
    createError: 'Ошибка. Попробуйте снова.',
    cancel: 'Отмена',
    creating: 'Создание...',
    create: 'Создать',
  },
  hy: {
    appName: 'TaskFlow',
    appSub: 'Բազմաալիք',
    live: 'Ուղիղ',
    offline: 'Անցանց',
    newTask: 'Նոր առաջ.',
    workspace: 'Տարածք',
    workspaceId: 'Տարածքի ID',
    copyToken: 'Պատճենել ID',
    changeWorkspace: 'Փոխել տարածք',
    total: 'Ընդամենը',
    loading: 'Բեռնվում է...',
    noTasksPage: 'Առաջադրանքներ չկան։ Ստեղծեք կամ գրեք բոտին։',
    pending: 'Սպասող',
    inProgress: 'Ընթացքում',
    completed: 'Ավարտված',
    noTasksCol: 'Առաջ. չկան',
    srcTelegram: 'Telegram',
    srcVoice: 'Ձայն',
    srcWeb: 'Վեբ',
    moveBack: 'Հետ',
    moveForward: 'Առաջ',
    deleteConfirm: (title) => `Ջնջե՞լ «${title}»`,
    modalTitle: 'Ստեղծել առաջ.',
    titleLabel: 'Վերնագիր',
    titlePlaceholder: 'Ի՞նչ պետք է անել',
    descLabel: 'Նկարագրություն',
    descPlaceholder: 'Լրացուցիչ մանրամասներ',
    statusLabel: 'Կարգավիճակ',
    titleRequired: 'Վերնագիրը պարտադիր է',
    createError: 'Չհաջողվեց ստեղծել։ Կրկին փորձեք։',
    cancel: 'Չեղարկել',
    creating: 'Ստեղծվում է...',
    create: 'Ստեղծել',
  },
}

export const LangContext = createContext({ t: translations.en, lang: 'en', setLang: () => {} })

export function useLang() {
  return useContext(LangContext)
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en')

  const setLang = (code) => {
    localStorage.setItem('lang', code)
    setLangState(code)
  }

  return (
    <LangContext.Provider value={{ t: translations[lang], lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}
