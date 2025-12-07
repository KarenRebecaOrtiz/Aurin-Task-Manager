/**
 * Client operations for chatbot
 */

export { searchClients } from './search'
export type { ClientSearchResult } from './search'

export { createClient } from './create'
export type { CreateClientData, ClientCreateResult } from './create'

export { getClient } from './get'
export type { ClientData, GetClientResult } from './get'

export { updateClient } from './update'
export type { UpdateClientData, ClientUpdateResult } from './update'
