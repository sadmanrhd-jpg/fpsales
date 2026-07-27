import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ubiwpygjplsvcjsfzoxu.supabase.co'
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const permissionDefinitions = [
  ['dashboard.today', 'View today dashboard', 'dashboard'],
  ['dashboard.history', 'Use daily, weekly and monthly dashboard filters', 'dashboard'],
  ['dashboard.export', 'Download dashboard PDF', 'dashboard'],
  ['sales.view24h', 'View completed sales from the last 24 hours', 'sales'],
  ['sales.viewAll', 'View all completed sales', 'sales'],
  ['sales.create', 'Create a new sales order', 'sales'],
  ['sales.edit', 'Edit a completed sale entry', 'sales'],
  ['sales.printKot', 'Print KOT and send an order to the kitchen', 'sales'],
  ['sales.printBill', 'Print a bill and record the completed sale', 'sales'],
  ['orders.view', 'View ongoing unpaid orders', 'orders'],
  ['orders.edit', 'Edit ongoing orders, tables, items and discounts', 'orders'],
  ['costs.view24h', 'View cost entries from the last 24 hours', 'costs'],
  ['costs.viewAll', 'View all cost entries', 'costs'],
  ['costs.create', 'Add Cost', 'costs'],
  ['costs.edit', 'Edit Cost', 'costs'],
  ['costs.remove', 'Remove Cost', 'costs'],
  ['audit.view', 'View edit history', 'audit'],
  ['reports.view', 'View financial reports', 'reports'],
  ['reports.export', 'Export report CSV and PDF files', 'reports'],
  ['menu.view', 'View the food menu management page', 'menu'],
  ['menu.categories.create', 'Add menu category', 'menu'],
  ['menu.categories.remove', 'Remove menu category', 'menu'],
  ['menu.items.create', 'Add menu item', 'menu'],
  ['menu.items.edit', 'Edit menu item details and prices', 'menu'],
  ['menu.items.availability', 'Change menu item availability', 'menu'],
  ['menu.items.remove', 'Remove menu item', 'menu'],
  ['settings.manage', 'Manage restaurant settings', 'settings'],
] as const

const permissionKeys = permissionDefinitions.map(([key]) => key)
const attachmentBucket = 'financial-entry-attachments'

function send(res: any, status: number, body: unknown) {
  res.status(status).json(body)
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected server error occurred.'
}

function parseBody(req: any) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

function getBearerToken(req: any) {
  const value = String(req.headers.authorization || '')
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function toUiPayment(value: string | null | undefined) {
  if (value === 'card') return 'Card'
  if (value === 'mobile_banking') return 'Mobile Banking'
  if (value === 'other') return 'Other'
  return 'Cash'
}

function toDbPayment(value: string | null | undefined) {
  if (value === 'Card') return 'card'
  if (value === 'Mobile Banking') return 'mobile_banking'
  if (value === 'Other') return 'other'
  return 'cash'
}

function emptyPermissions() {
  return Object.fromEntries(permissionKeys.map((key) => [key, false]))
}

function allPermissions() {
  return Object.fromEntries(permissionKeys.map((key) => [key, true]))
}

function parseOrderMeta(notes: unknown) {
  try {
    const parsed = JSON.parse(String(notes || '{}'))
    return {
      tableNumber: typeof parsed.tableNumber === 'string' ? parsed.tableNumber : 'Table 01',
      paymentMethod: typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : 'Cash',
    }
  } catch {
    return { tableNumber: 'Table 01', paymentMethod: 'Cash' }
  }
}

function mapFinancialRow(row: any, attachment?: any) {
  const common = {
    id: row.id,
    amount: Number(row.amount),
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    editCount: Number(row.edit_count || 0),
    attachmentName: attachment?.original_filename || undefined,
    attachmentDataUrl: attachment?.signed_url || undefined,
  }
  if (row.entry_kind === 'cost') {
    return {
      ...common,
      kind: 'cost',
      category: row.cost_category || 'Other expense',
      description: row.description || '',
    }
  }
  return {
    ...common,
    kind: 'sale',
    paymentMethod: toUiPayment(row.payment_method),
    note: row.note || '',
  }
}

function mapFinancialSnapshot(value: any) {
  if (value?.kind === 'sale' || value?.kind === 'cost') return value
  return mapFinancialRow(value || {})
}

function pinKey(profileId: string) {
  return `deletion_pin:${profileId}`
}

function createPinCredential(pin: string) {
  const salt = randomBytes(18).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return { salt, hash }
}

function verifyPinCredential(pin: string, credential: any) {
  if (!credential?.salt || !credential?.hash) return false
  const expected = Buffer.from(String(credential.hash), 'hex')
  const actual = scryptSync(pin, String(credential.salt), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

async function ensurePermissionCatalog(admin: any) {
  const rows = permissionDefinitions.map(([permission_key, label, module_key]) => ({ permission_key, label, module_key }))
  const { error } = await admin.from('permissions').upsert(rows, { onConflict: 'permission_key' })
  if (error) throw new Error(`Permission setup failed: ${error.message}`)
}

async function loadProfilePermissions(admin: any, profileId?: string) {
  let query = admin.from('profile_permissions').select('profile_id, allowed, permissions(permission_key)')
  if (profileId) query = query.eq('profile_id', profileId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const byProfile = new Map<string, Record<string, boolean>>()
  for (const row of data || []) {
    const current = byProfile.get(row.profile_id) || emptyPermissions()
    const relation = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions
    const key = relation?.permission_key
    if (key && permissionKeys.includes(key)) current[key] = Boolean(row.allowed)
    byProfile.set(row.profile_id, current)
  }
  return byProfile
}

async function getActor(admin: any, req: any) {
  const token = getBearerToken(req)
  if (!token) throw new Error('AUTH_REQUIRED')
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) throw new Error('AUTH_REQUIRED')
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()
  if (profileError || !profile) throw new Error('PROFILE_MISSING')
  if (!profile.active) throw new Error('ACCOUNT_INACTIVE')
  const permissionMap = profile.role === 'superadmin'
    ? allPermissions()
    : (await loadProfilePermissions(admin, profile.id)).get(profile.id) || emptyPermissions()
  return { authUser: userData.user, profile, permissions: permissionMap }
}

function requirePermission(actor: any, key: string) {
  if (actor.profile.role === 'superadmin') return
  if (!actor.permissions[key]) throw new Error('PERMISSION_DENIED')
}

function requireSuperadmin(actor: any) {
  if (actor.profile.role !== 'superadmin') throw new Error('SUPERADMIN_REQUIRED')
}

async function getPinCredential(admin: any, actor: any) {
  const branchId = actor.profile.default_branch_id
  if (!branchId) return null
  const { data, error } = await admin
    .from('branch_settings')
    .select('setting_value')
    .eq('branch_id', branchId)
    .eq('setting_key', pinKey(actor.profile.id))
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.setting_value || null
}

async function requireValidPin(admin: any, actor: any, pin: unknown) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('Enter your 4 digit deletion PIN.')
  const credential = await getPinCredential(admin, actor)
  if (!verifyPinCredential(String(pin), credential)) throw new Error('The deletion PIN is incorrect.')
}

async function ensureAttachmentBucket(admin: any) {
  const { data } = await admin.storage.getBucket(attachmentBucket)
  if (data) return
  const { error } = await admin.storage.createBucket(attachmentBucket, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
  })
  if (error && !String(error.message).toLowerCase().includes('already exists')) throw new Error(error.message)
}

async function uploadAttachment(admin: any, actor: any, entryId: string, attachmentName: unknown, attachmentDataUrl: unknown) {
  const dataUrl = String(attachmentDataUrl || '')
  if (!dataUrl.startsWith('data:')) return
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/)
  if (!match) throw new Error('The attachment could not be read.')
  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength > 2 * 1024 * 1024) throw new Error('Attachment must be 2 MB or smaller.')
  await ensureAttachmentBucket(admin)
  const safeName = String(attachmentName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${actor.profile.organisation_id}/${actor.profile.default_branch_id}/${entryId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await admin.storage.from(attachmentBucket).upload(path, buffer, { contentType: mimeType, upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { error: insertError } = await admin.from('entry_attachments').insert({
    financial_entry_id: entryId,
    storage_path: path,
    original_filename: safeName,
    mime_type: mimeType,
    size_bytes: buffer.byteLength,
    uploaded_by: actor.profile.id,
  })
  if (insertError) {
    await admin.storage.from(attachmentBucket).remove([path])
    throw new Error(insertError.message)
  }
}

async function loadAttachmentMap(admin: any, entryIds: string[]) {
  const result = new Map<string, any>()
  if (!entryIds.length) return result
  const { data, error } = await admin
    .from('entry_attachments')
    .select('*')
    .in('financial_entry_id', entryIds)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  for (const row of data || []) {
    if (result.has(row.financial_entry_id)) continue
    const { data: signed } = await admin.storage.from(attachmentBucket).createSignedUrl(row.storage_path, 60 * 60)
    result.set(row.financial_entry_id, { ...row, signed_url: signed?.signedUrl })
  }
  return result
}

async function bootstrap(admin: any, actor: any) {
  const organisationId = actor.profile.organisation_id
  const branchId = actor.profile.default_branch_id
  if (!branchId) throw new Error('Your account has no default branch assigned.')

  const [profilesResult, entriesResult, auditsResult, categoriesResult, itemsResult, ordersResult, organisationResult, branchResult, latestOrderResult] = await Promise.all([
    admin.from('profiles').select('*').eq('organisation_id', organisationId).order('created_at'),
    admin.from('financial_entries').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).is('archived_at', null).order('occurred_at', { ascending: false }),
    admin.from('financial_entry_audits').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).order('edited_at', { ascending: false }),
    admin.from('menu_categories').select('*').eq('branch_id', branchId).order('sort_order').order('created_at'),
    admin.from('menu_items').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }),
    admin.from('orders').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).in('status', ['draft', 'confirmed', 'preparing', 'ready', 'served']).order('opened_at', { ascending: false }),
    admin.from('organisations').select('*').eq('id', organisationId).single(),
    admin.from('branches').select('*').eq('id', branchId).single(),
    admin.from('orders').select('order_number').eq('branch_id', branchId).order('order_number', { ascending: false }).limit(1),
  ])

  for (const result of [profilesResult, entriesResult, auditsResult, categoriesResult, itemsResult, ordersResult, organisationResult, branchResult, latestOrderResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const profiles = profilesResult.data || []
  const profilePermissions = await loadProfilePermissions(admin)
  const currentPin = await getPinCredential(admin, actor)
  const allEntryRows = entriesResult.data || []
  const cutoff24Hours = Date.now() - 24 * 60 * 60 * 1000
  const canSeeAllSales = actor.profile.role === 'superadmin' || actor.permissions['sales.viewAll'] || actor.permissions['reports.view']
  const canSeeRecentSales = canSeeAllSales || actor.permissions['sales.view24h']
  const canSeeAllCosts = actor.profile.role === 'superadmin' || actor.permissions['costs.viewAll'] || actor.permissions['reports.view']
  const canSeeRecentCosts = canSeeAllCosts || actor.permissions['costs.view24h']
  const entries = allEntryRows.filter((row: any) => {
    const occurred = new Date(row.occurred_at).getTime()
    if (row.entry_kind === 'sale') return canSeeAllSales || (canSeeRecentSales && occurred >= cutoff24Hours)
    return canSeeAllCosts || (canSeeRecentCosts && occurred >= cutoff24Hours)
  })
  const attachmentMap = await loadAttachmentMap(admin, entries.map((row: any) => row.id))
  const orders = (actor.profile.role === 'superadmin' || actor.permissions['orders.view']) ? (ordersResult.data || []) : []
  const orderIds = orders.map((row: any) => row.id)
  let orderItems: any[] = []
  if (orderIds.length) {
    const result = await admin.from('order_items').select('*').in('order_id', orderIds).order('created_at')
    if (result.error) throw new Error(result.error.message)
    orderItems = result.data || []
  }

  const users = profiles.map((profile: any) => {
    const canManageUsers = actor.profile.role === 'superadmin'
    const isCurrent = profile.id === actor.profile.id
    return {
      id: profile.id,
      name: profile.full_name,
      email: canManageUsers || isCurrent ? profile.email : '',
      role: canManageUsers || isCurrent ? profile.role : 'reception',
      active: canManageUsers || isCurrent ? profile.active : true,
      permissions: canManageUsers
        ? (profile.role === 'superadmin' ? allPermissions() : profilePermissions.get(profile.id) || emptyPermissions())
        : (isCurrent ? actor.permissions : emptyPermissions()),
      hasDeletionPin: isCurrent ? Boolean(currentPin) : false,
      createdAt: profile.created_at,
    }
  })

  const sales = entries.filter((row: any) => row.entry_kind === 'sale').map((row: any) => mapFinancialRow(row, attachmentMap.get(row.id)))
  const costs = entries.filter((row: any) => row.entry_kind === 'cost').map((row: any) => mapFinancialRow(row, attachmentMap.get(row.id)))
  const audits = (actor.profile.role === 'superadmin' || actor.permissions['audit.view'] ? (auditsResult.data || []) : []).map((row: any) => ({
    id: row.id,
    entryId: row.financial_entry_id,
    entryKind: row.original_data?.entry_kind || row.original_data?.kind || 'sale',
    originalData: mapFinancialSnapshot(row.original_data),
    updatedData: mapFinancialSnapshot(row.updated_data),
    reason: row.edit_reason,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    editNumber: Number(row.edit_number),
  }))
  const canSeeMenu = actor.profile.role === 'superadmin' || actor.permissions['menu.view'] || actor.permissions['sales.create']
  const categories = (canSeeMenu ? (categoriesResult.data || []) : []).map((row: any) => ({
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
    createdBy: actor.profile.id,
  }))
  const menuItems = (canSeeMenu ? (itemsResult.data || []) : []).map((row: any) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id || '',
    description: row.description || '',
    price: Number(row.sale_price),
    available: row.active,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    createdBy: actor.profile.id,
  }))
  const ongoingOrders = orders.map((row: any) => {
    const meta = parseOrderMeta(row.notes)
    return {
      id: row.id,
      orderNumber: Number(row.order_number),
      tableNumber: meta.tableNumber,
      lines: orderItems.filter((item) => item.order_id === row.id).map((item) => ({
        itemId: item.menu_item_id || `snapshot-${item.id}`,
        name: item.item_name_snapshot,
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
      })),
      discount: Number(row.discount_amount),
      paymentMethod: toUiPayment(toDbPayment(meta.paymentMethod)),
      subtotal: Number(row.subtotal),
      total: Number(row.total_amount),
      status: 'KOT sent',
      createdAt: row.opened_at,
      updatedAt: row.opened_at,
      createdBy: row.created_by,
    }
  })

  return {
    state: {
      users,
      sales,
      costs,
      auditRecords: audits,
      menuCategories: categories,
      menuItems,
      orders: ongoingOrders,
      nextOrderNumber: Number(latestOrderResult.data?.[0]?.order_number || 0) + 1,
      settings: {
        restaurantName: organisationResult.data.name,
        branchName: branchResult.data.name,
        currencyCode: branchResult.data.currency_code,
        timezone: branchResult.data.timezone,
        address: branchResult.data.address || '',
      },
    },
    currentUserId: actor.profile.id,
  }
}

async function createFinancialEntry(admin: any, actor: any, payload: any) {
  const kind = payload.kind === 'cost' ? 'cost' : 'sale'
  requirePermission(actor, kind === 'sale' ? 'sales.create' : 'costs.create')
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.')
  const row: any = {
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    entry_kind: kind,
    amount,
    occurred_at: payload.occurredAt,
    created_by: actor.profile.id,
  }
  if (kind === 'sale') {
    row.payment_method = toDbPayment(payload.paymentMethod)
    row.note = String(payload.note || '')
  } else {
    row.cost_category = String(payload.category || 'Other expense')
    row.description = String(payload.description || '')
  }
  const { data, error } = await admin.from('financial_entries').insert(row).select('*').single()
  if (error) throw new Error(error.message)
  try {
    await uploadAttachment(admin, actor, data.id, payload.attachmentName, payload.attachmentDataUrl)
  } catch (error) {
    await admin.from('financial_entries').delete().eq('id', data.id)
    throw error
  }
  return mapFinancialRow(data)
}

async function updateFinancialEntry(admin: any, actor: any, payload: any) {
  const { data: original, error: fetchError } = await admin
    .from('financial_entries')
    .select('*')
    .eq('id', payload.id)
    .eq('organisation_id', actor.profile.organisation_id)
    .eq('branch_id', actor.profile.default_branch_id)
    .is('archived_at', null)
    .single()
  if (fetchError || !original) throw new Error('The entry could not be found.')
  requirePermission(actor, original.entry_kind === 'sale' ? 'sales.edit' : 'costs.edit')
  const reason = String(payload.reason || '').trim()
  if (!reason) throw new Error('Write a reason before saving this edit.')
  if (actor.profile.role === 'reception') {
    const age = Date.now() - new Date(original.occurred_at).getTime()
    if (Number(original.edit_count) >= 2 || age > 24 * 60 * 60 * 1000) throw new Error('Reception users can edit an entry only twice and only within 24 hours.')
  }
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.')
  const changes: any = {
    amount,
    occurred_at: payload.occurredAt,
    edit_count: Number(original.edit_count) + 1,
    updated_at: new Date().toISOString(),
  }
  if (original.entry_kind === 'sale') {
    changes.payment_method = toDbPayment(payload.paymentMethod)
    changes.note = String(payload.note || '')
  } else {
    changes.cost_category = String(payload.category || 'Other expense')
    changes.description = String(payload.description || '')
  }
  const { data: updated, error: updateError } = await admin.from('financial_entries').update(changes).eq('id', original.id).select('*').single()
  if (updateError) throw new Error(updateError.message)
  const { error: auditError } = await admin.from('financial_entry_audits').insert({
    financial_entry_id: original.id,
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    original_data: original,
    updated_data: updated,
    edit_reason: reason,
    edited_by: actor.profile.id,
    edit_number: updated.edit_count,
  })
  if (auditError) {
    await admin.from('financial_entries').update({
      amount: original.amount,
      payment_method: original.payment_method,
      cost_category: original.cost_category,
      note: original.note,
      description: original.description,
      occurred_at: original.occurred_at,
      edit_count: original.edit_count,
      updated_at: original.updated_at,
    }).eq('id', original.id)
    throw new Error(`The edit was cancelled because audit logging failed: ${auditError.message}`)
  }
  await uploadAttachment(admin, actor, original.id, payload.attachmentName, payload.attachmentDataUrl)
  return mapFinancialRow(updated)
}

async function saveUserPermissions(admin: any, actorId: string, profileId: string, permissions: Record<string, boolean>) {
  await ensurePermissionCatalog(admin)
  const selectedKeys = permissionKeys.filter((key) => Boolean(permissions?.[key]))
  const { error: deleteError } = await admin.from('profile_permissions').delete().eq('profile_id', profileId)
  if (deleteError) throw new Error(deleteError.message)
  if (!selectedKeys.length) return
  const { data: permissionRows, error: permissionError } = await admin.from('permissions').select('id, permission_key').in('permission_key', selectedKeys)
  if (permissionError) throw new Error(permissionError.message)
  const rows = (permissionRows || []).map((permission: any) => ({
    profile_id: profileId,
    permission_id: permission.id,
    allowed: true,
    granted_by: actorId,
  }))
  const { error: insertError } = await admin.from('profile_permissions').insert(rows)
  if (insertError) throw new Error(insertError.message)
}

async function handleAction(admin: any, actor: any, action: string, payload: any) {
  const organisationId = actor.profile.organisation_id
  const branchId = actor.profile.default_branch_id
  if (!branchId) throw new Error('Your account has no default branch assigned.')

  if (action === 'create_entry') return createFinancialEntry(admin, actor, payload)
  if (action === 'update_entry') return updateFinancialEntry(admin, actor, payload)

  if (action === 'delete_cost') {
    requirePermission(actor, 'costs.remove')
    await requireValidPin(admin, actor, payload.pin)
    const { data, error } = await admin.from('financial_entries').update({ archived_at: new Date().toISOString() })
      .eq('id', payload.id).eq('organisation_id', organisationId).eq('branch_id', branchId).eq('entry_kind', 'cost').is('archived_at', null).select('id').maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('The cost entry could not be found.')
    return { success: true }
  }

  if (action === 'create_menu_category') {
    requirePermission(actor, 'menu.categories.create')
    const name = String(payload.name || '').trim()
    if (!name) throw new Error('Enter a category name.')
    const { error } = await admin.from('menu_categories').insert({ branch_id: branchId, name, active: true })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'delete_menu_category') {
    requirePermission(actor, 'menu.categories.remove')
    await requireValidPin(admin, actor, payload.pin)
    const { error } = await admin.from('menu_categories').delete().eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'create_menu_item') {
    requirePermission(actor, 'menu.items.create')
    const { error } = await admin.from('menu_items').insert({
      branch_id: branchId,
      category_id: payload.categoryId || null,
      name: String(payload.name || '').trim(),
      description: String(payload.description || ''),
      sale_price: Number(payload.price),
      active: Boolean(payload.available),
    })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'update_menu_item') {
    requirePermission(actor, 'menu.items.edit')
    const { error } = await admin.from('menu_items').update({
      category_id: payload.categoryId || null,
      name: String(payload.name || '').trim(),
      description: String(payload.description || ''),
      sale_price: Number(payload.price),
      active: Boolean(payload.available),
    }).eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'toggle_menu_item') {
    requirePermission(actor, 'menu.items.availability')
    const { error } = await admin.from('menu_items').update({ active: Boolean(payload.available) }).eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'delete_menu_item') {
    requirePermission(actor, 'menu.items.remove')
    await requireValidPin(admin, actor, payload.pin)
    const { error } = await admin.from('menu_items').delete().eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'create_order') {
    requirePermission(actor, 'sales.create')
    requirePermission(actor, 'sales.printKot')
    const lines = Array.isArray(payload.lines) ? payload.lines : []
    if (!lines.length) throw new Error('Add at least one food item.')
    const { data: order, error: orderError } = await admin.from('orders').insert({
      organisation_id: organisationId,
      branch_id: branchId,
      status: 'confirmed',
      subtotal: Number(payload.subtotal),
      discount_amount: Number(payload.discount),
      total_amount: Number(payload.total),
      notes: JSON.stringify({ tableNumber: payload.tableNumber, paymentMethod: payload.paymentMethod }),
      created_by: actor.profile.id,
    }).select('*').single()
    if (orderError) throw new Error(orderError.message)
    const orderRows = lines.map((line: any) => ({
      order_id: order.id,
      menu_item_id: typeof line.itemId === 'string' && !line.itemId.startsWith('snapshot-') ? line.itemId : null,
      item_name_snapshot: line.name,
      quantity: Number(line.quantity),
      unit_price: Number(line.price),
      line_total: Number(line.price) * Number(line.quantity),
    }))
    const { error: itemError } = await admin.from('order_items').insert(orderRows)
    if (itemError) {
      await admin.from('orders').delete().eq('id', order.id)
      throw new Error(itemError.message)
    }
    await admin.from('kitchen_order_tokens').insert({ branch_id: branchId, order_id: order.id, printed_at: new Date().toISOString() })
    return {
      id: order.id,
      orderNumber: Number(order.order_number),
      tableNumber: payload.tableNumber,
      lines,
      discount: Number(payload.discount),
      paymentMethod: payload.paymentMethod,
      subtotal: Number(payload.subtotal),
      total: Number(payload.total),
      status: 'KOT sent',
      createdAt: order.opened_at,
      updatedAt: order.opened_at,
      createdBy: actor.profile.id,
    }
  }

  if (action === 'update_order') {
    requirePermission(actor, 'orders.edit')
    const { data: existing, error: fetchError } = await admin.from('orders').select('id').eq('id', payload.id).eq('organisation_id', organisationId).eq('branch_id', branchId).single()
    if (fetchError || !existing) throw new Error('The order could not be found.')
    const { error: updateError } = await admin.from('orders').update({
      subtotal: Number(payload.subtotal),
      discount_amount: Number(payload.discount),
      total_amount: Number(payload.total),
      notes: JSON.stringify({ tableNumber: payload.tableNumber, paymentMethod: payload.paymentMethod }),
    }).eq('id', payload.id)
    if (updateError) throw new Error(updateError.message)
    const { error: deleteError } = await admin.from('order_items').delete().eq('order_id', payload.id)
    if (deleteError) throw new Error(deleteError.message)
    const lines = Array.isArray(payload.lines) ? payload.lines : []
    if (lines.length) {
      const { error: insertError } = await admin.from('order_items').insert(lines.map((line: any) => ({
        order_id: payload.id,
        menu_item_id: typeof line.itemId === 'string' && !line.itemId.startsWith('snapshot-') ? line.itemId : null,
        item_name_snapshot: line.name,
        quantity: Number(line.quantity),
        unit_price: Number(line.price),
        line_total: Number(line.price) * Number(line.quantity),
      })))
      if (insertError) throw new Error(insertError.message)
    }
    return { success: true }
  }

  if (action === 'complete_sale') {
    requirePermission(actor, 'sales.create')
    requirePermission(actor, 'sales.printBill')
    return createFinancialEntry(admin, actor, { ...payload, kind: 'sale' })
  }

  if (action === 'complete_order') {
    requirePermission(actor, 'sales.printBill')
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', payload.orderId).eq('organisation_id', organisationId).eq('branch_id', branchId).single()
    if (orderError || !order) throw new Error('The order could not be found.')
    const { error: closeError } = await admin.from('orders').update({ status: 'completed', closed_at: new Date().toISOString() }).eq('id', order.id)
    if (closeError) throw new Error(closeError.message)
    try {
      const sale = await createFinancialEntry(admin, actor, { ...payload.sale, kind: 'sale' })
      return sale
    } catch (error) {
      await admin.from('orders').update({ status: 'confirmed', closed_at: null }).eq('id', order.id)
      throw error
    }
  }

  if (action === 'save_settings') {
    requirePermission(actor, 'settings.manage')
    const settings = payload.settings || {}
    const { error: organisationError } = await admin.from('organisations').update({ name: String(settings.restaurantName || '').trim() }).eq('id', organisationId)
    if (organisationError) throw new Error(organisationError.message)
    const { error: branchError } = await admin.from('branches').update({
      name: String(settings.branchName || '').trim(),
      currency_code: String(settings.currencyCode || 'BDT').toUpperCase().slice(0, 3),
      timezone: String(settings.timezone || 'Asia/Dhaka'),
      address: String(settings.address || ''),
    }).eq('id', branchId)
    if (branchError) throw new Error(branchError.message)
    return { success: true }
  }

  if (action === 'save_deletion_pin') {
    const newPin = String(payload.newPin || '')
    if (!/^\d{4}$/.test(newPin)) throw new Error('The deletion PIN must contain exactly 4 digits.')
    const current = await getPinCredential(admin, actor)
    if (current && !verifyPinCredential(String(payload.currentPin || ''), current)) throw new Error('The current deletion PIN is incorrect.')
    const credential = createPinCredential(newPin)
    const { error } = await admin.from('branch_settings').upsert({
      branch_id: branchId,
      setting_key: pinKey(actor.profile.id),
      setting_value: credential,
      updated_by: actor.profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'branch_id,setting_key' })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'create_user') {
    requireSuperadmin(actor)
    const email = String(payload.email || '').trim().toLowerCase()
    const name = String(payload.name || '').trim()
    const password = String(payload.password || '')
    const role = ['reception', 'manager', 'admin'].includes(payload.role) ? payload.role : 'reception'
    if (!name || !email) throw new Error('Name and email are required.')
    if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (authError || !created.user) throw new Error(authError?.message || 'The user could not be created.')
    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      organisation_id: organisationId,
      default_branch_id: branchId,
      full_name: name,
      email,
      role,
      active: true,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      throw new Error(profileError.message)
    }
    try {
      await saveUserPermissions(admin, actor.profile.id, created.user.id, payload.permissions || {})
    } catch (error) {
      await admin.from('profiles').delete().eq('id', created.user.id)
      await admin.auth.admin.deleteUser(created.user.id)
      throw error
    }
    return { success: true }
  }

  if (action === 'update_user') {
    requireSuperadmin(actor)
    const { data: target, error: targetError } = await admin.from('profiles').select('*').eq('id', payload.id).eq('organisation_id', organisationId).single()
    if (targetError || !target) throw new Error('The user could not be found.')
    if (target.role === 'superadmin') throw new Error('The superadmin account cannot be restricted.')
    const changes: any = {}
    if (typeof payload.active === 'boolean') changes.active = payload.active
    if (['reception', 'manager', 'admin'].includes(payload.role)) changes.role = payload.role
    if (Object.keys(changes).length) {
      const { error } = await admin.from('profiles').update(changes).eq('id', target.id)
      if (error) throw new Error(error.message)
    }
    if (payload.permissions) await saveUserPermissions(admin, actor.profile.id, target.id, payload.permissions)
    return { success: true }
  }

  if (action === 'reset_user_password') {
    requireSuperadmin(actor)
    const password = String(payload.password || '')
    if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
    const { data: target, error: targetError } = await admin.from('profiles').select('id, role').eq('id', payload.id).eq('organisation_id', organisationId).single()
    if (targetError || !target) throw new Error('The user could not be found.')
    const { error } = await admin.auth.admin.updateUserById(target.id, { password })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  throw new Error('Unknown application action.')
}

export default async function handler(req: any, res: any) {
  if (!supabaseUrl || !supabaseSecret) {
    return send(res, 500, { error: 'Server environment variables are incomplete. Add SUPABASE_SECRET_KEY in Vercel.' })
  }
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed.' })

  const admin = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const actor = await getActor(admin, req)
    if (req.method === 'GET') {
      const data = await bootstrap(admin, actor)
      return send(res, 200, { data })
    }
    const body = parseBody(req)
    const data = await handleAction(admin, actor, String(body.action || ''), body.payload || {})
    return send(res, 200, { data })
  } catch (error) {
    const message = messageFrom(error)
    if (message === 'AUTH_REQUIRED') return send(res, 401, { error: 'Your session has expired. Sign in again.' })
    if (message === 'PROFILE_MISSING') return send(res, 403, { error: 'Your Supabase Auth account is not linked to an application profile.' })
    if (message === 'ACCOUNT_INACTIVE') return send(res, 403, { error: 'This account is inactive.' })
    if (message === 'PERMISSION_DENIED') return send(res, 403, { error: 'You do not have permission to perform this action.' })
    if (message === 'SUPERADMIN_REQUIRED') return send(res, 403, { error: 'Only the superadmin can perform this action.' })
    return send(res, 400, { error: message })
  }
}
