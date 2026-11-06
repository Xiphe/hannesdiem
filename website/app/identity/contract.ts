/** Private browser state shared by login, Watch and Circle. */
export interface SessionState {
  ready: boolean
  email?: string
  csrfToken?: string
}

export const csrfRejectionHeader = 'X-Hdm-Csrf-Rejected'
