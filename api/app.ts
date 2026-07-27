import { Buffer } from 'node:buffer'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ubiwpygjplsvcjsfzoxu.supabase.co'
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_v0mtlfR8teOu-tDfkwMERQ_eagIJhYk'

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
const attachmentBucket = 'entry_attachments'

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

function emptyPermissions() {
  return Object.fromEntries(permissionKeys.map((key) => [key, false]))
}

function allPermissions() {
  return Object.fromEntries(permissionKeys.map((key) => [key, true]))
}

function mapSaleRow(row: any, attachment?: any) {
  return {
    id: row.id,
    kind: 'sale',
    amount: Number(row.total_amount ?? row.amount ?? 0),
    paymentMethod: row.payment_method || 'Cash',
    note: row.note || '',
    occurredAt: row.completed_at || row.occurred_at || row.created_at,
    createdAt: row.created_at,
    createdBy: row.completed_by || row.created_by,
    editCount: Number(row.edit_count || 0),
    attachmentName: attachment?.original_filename || undefined,
    attachmentDataUrl: attachment?.signed_url || undefined,
  }
}

function mapCostRow(row: any, attachment?: any) {
  return {
    id: row.id,
    kind: 'cost',
    category: row.category_name_snapshot || row.cost_category || 'Other expense',
    amount: Number(row.amount || 0),
    description: row.description || '',
    occurredAt: row.occurred_at || row.created_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    editCount: Number(row.edit_count || 0),
    attachmentName: attachment?.original_filename || undefined,
    attachmentDataUrl: attachment?.signed_url || undefined,
  }
}

function mapSnapshot(value: any, kind: string) {
  if (value?.kind === 'sale' || value?.kind === 'cost') return value
  return kind === 'cost' ? mapCostRow(value || {}) : mapSaleRow(value || {})
}

async function ensurePermissionCatalog(admin: any) {
  const rows = permissionDefinitions.map(([permission_key, label, module_key], index) => ({
    permission_key,
    label,
    module_key,
    assignable: true,
    display_order: index + 1,
  }))
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
  const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('id', userData.user.id).single()
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

async function ensureAttachmentBucket(admin: any) {
  const { data } = await admin.storage.getBucket(attachmentBucket)
  if (data) return
  const { error } = await admin.storage.createBucket(attachmentBucket, { public: false, fileSizeLimit: 2 * 1024 * 1024 })
  if (error && !String(error.message).toLowerCase().includes('already exists')) throw new Error(error.message)
}

async function uploadAttachment(admin: any, actor: any, kind: 'sale' | 'cost', entryId: string, attachmentName: unknown, attachmentDataUrl: unknown) {
  const dataUrl = String(attachmentDataUrl || '')
  if (!dataUrl.startsWith('data:')) return
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/)
  if (!match) throw new Error('The attachment could not be read.')
  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength > 2 * 1024 * 1024) throw new Error('Attachment must be 2 MB or smaller.')
  await ensureAttachmentBucket(admin)
  const safeName = String(attachmentName || 'attachment').replace(/[^a-zA-Z0-9._]/g, '_')
  const path = `${actor.profile.organisation_id}/${actor.profile.default_branch_id}/${kind}/${entryId}/${Date.now()}_${safeName}`
  const { error: uploadError } = await admin.storage.from(attachmentBucket).upload(path, buffer, { contentType: mimeType, upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { error: insertError } = await admin.from('entry_attachments').insert({
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    entity_kind: kind,
    entity_id: entryId,
    storage_bucket: attachmentBucket,
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

async function loadAttachmentMap(admin: any, salesIds: string[], costIds: string[]) {
  const result = new Map<string, any>()
  const rows: any[] = []

  if (salesIds.length) {
    const { data, error } = await admin
      .from('entry_attachments')
      .select('*')
      .eq('entity_kind', 'sale')
      .in('entity_id', salesIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
  }

  if (costIds.length) {
    const { data, error } = await admin
      .from('entry_attachments')
      .select('*')
      .eq('entity_kind', 'cost')
      .in('entity_id', costIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
  }

  for (const row of rows) {
    const key = `${row.entity_kind}:${row.entity_id}`
    if (result.has(key)) continue
    const bucket = row.storage_bucket || attachmentBucket
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(row.storage_path, 60 * 60)
    result.set(key, { ...row, signed_url: signed?.signedUrl })
  }
  return result
}

async function ensureRestaurantTables(admin: any, branchId: string) {
  const rows = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      branch_id: branchId,
      table_number: number,
      display_name: `Table ${number}`,
      capacity: 4,
      active: true,
      sort_order: index + 1,
    }
  })
  const { error } = await admin.from('restaurant_tables').upsert(rows, { onConflict: 'branch_id,table_number', ignoreDuplicates: true })
  if (error) throw new Error(`Restaurant table setup failed: ${error.message}`)
}

async function resolveTable(admin: any, branchId: string, displayName: unknown) {
  await ensureRestaurantTables(admin, branchId)
  const name = String(displayName || 'Table 01')
  const numberMatch = name.match(/(\d+)/)
  const tableNumber = String(Number(numberMatch?.[1] || 1)).padStart(2, '0')
  const { data, error } = await admin
    .from('restaurant_tables')
    .select('*')
    .eq('branch_id', branchId)
    .eq('table_number', tableNumber)
    .eq('active', true)
    .single()
  if (error || !data) throw new Error('Select a valid restaurant table.')
  return data
}

async function ensureCostCategory(admin: any, organisationId: string, nameInput: unknown) {
  const name = String(nameInput || 'Other expense').trim() || 'Other expense'
  const { data: existing, error: findError } = await admin
    .from('cost_categories')
    .select('*')
    .eq('organisation_id', organisationId)
    .ilike('name', name)
    .maybeSingle()
  if (findError) throw new Error(findError.message)
  if (existing) return existing
  const { data, error } = await admin.from('cost_categories').insert({ organisation_id: organisationId, name, active: true }).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

async function logAudit(admin: any, actor: any, action: string, entityType: string, entityId: string, previousData: any, newData: any, metadata: any = {}) {
  const { error } = await admin.from('audit_logs').insert({
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    actor_id: actor.profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    previous_data: previousData,
    new_data: newData,
    metadata,
  })
  if (error) throw new Error(error.message)
}

async function bootstrap(admin: any, actor: any) {
  const organisationId = actor.profile.organisation_id
  const branchId = actor.profile.default_branch_id
  if (!branchId) throw new Error('Your account has no default branch assigned.')

  await ensurePermissionCatalog(admin)
  await ensureRestaurantTables(admin, branchId)

  const [profilesResult, salesResult, costsResult, auditsResult, categoriesResult, itemsResult, tablesResult, ordersResult, organisationResult, branchResult, settingsResult, latestOrderResult, pinResult] = await Promise.all([
    admin.from('profiles').select('*').eq('organisation_id', organisationId).order('created_at'),
    admin.from('sales').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).order('completed_at', { ascending: false }),
    admin.from('costs').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).order('occurred_at', { ascending: false }),
    admin.from('entry_audits').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).order('edited_at', { ascending: false }),
    admin.from('menu_categories').select('*').eq('branch_id', branchId).order('sort_order').order('created_at'),
    admin.from('menu_items').select('*').eq('branch_id', branchId).eq('active', true).order('created_at', { ascending: false }),
    admin.from('restaurant_tables').select('*').eq('branch_id', branchId).eq('active', true).order('sort_order'),
    admin.from('orders').select('*').eq('organisation_id', organisationId).eq('branch_id', branchId).in('status', ['draft', 'kot_sent']).order('created_at', { ascending: false }),
    admin.from('organisations').select('*').eq('id', organisationId).single(),
    admin.from('branches').select('*').eq('id', branchId).single(),
    admin.from('branch_settings').select('*').eq('branch_id', branchId).maybeSingle(),
    admin.from('orders').select('order_number').eq('branch_id', branchId).order('order_number', { ascending: false }).limit(1),
    admin.from('deletion_pin_credentials').select('user_id').eq('user_id', actor.profile.id).maybeSingle(),
  ])

  for (const result of [profilesResult, salesResult, costsResult, auditsResult, categoriesResult, itemsResult, tablesResult, ordersResult, organisationResult, branchResult, settingsResult, latestOrderResult, pinResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const profiles = profilesResult.data || []
  const profilePermissions = await loadProfilePermissions(admin)
  const cutoff24Hours = Date.now() - 24 * 60 * 60 * 1000
  const canSeeAllSales = actor.profile.role === 'superadmin' || actor.permissions['sales.viewAll'] || actor.permissions['reports.view'] || actor.permissions['dashboard.history']
  const canSeeRecentSales = canSeeAllSales || actor.permissions['sales.view24h'] || actor.permissions['dashboard.today']
  const canSeeAllCosts = actor.profile.role === 'superadmin' || actor.permissions['costs.viewAll'] || actor.permissions['reports.view'] || actor.permissions['dashboard.history']
  const canSeeRecentCosts = canSeeAllCosts || actor.permissions['costs.view24h'] || actor.permissions['dashboard.today']

  const visibleSaleRows = (salesResult.data || []).filter((row: any) => canSeeAllSales || (canSeeRecentSales && new Date(row.completed_at).getTime() >= cutoff24Hours))
  const visibleCostRows = (costsResult.data || []).filter((row: any) => canSeeAllCosts || (canSeeRecentCosts && new Date(row.occurred_at).getTime() >= cutoff24Hours))
  const attachmentMap = await loadAttachmentMap(admin, visibleSaleRows.map((row: any) => row.id), visibleCostRows.map((row: any) => row.id))

  const canManageUsers = actor.profile.role === 'superadmin'
  const users = profiles.map((profile: any) => {
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
      hasDeletionPin: isCurrent ? Boolean(pinResult.data) : false,
      createdAt: profile.created_at,
    }
  })

  const sales = visibleSaleRows.map((row: any) => mapSaleRow(row, attachmentMap.get(`sale:${row.id}`)))
  const costs = visibleCostRows.map((row: any) => mapCostRow(row, attachmentMap.get(`cost:${row.id}`)))
  const audits = (actor.profile.role === 'superadmin' || actor.permissions['audit.view'] ? (auditsResult.data || []) : []).map((row: any) => ({
    id: row.id,
    entryId: row.entity_id,
    entryKind: row.entity_kind,
    originalData: mapSnapshot(row.previous_data, row.entity_kind),
    updatedData: mapSnapshot(row.updated_data, row.entity_kind),
    reason: row.reason,
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
    createdBy: row.created_by || actor.profile.id,
  }))
  const menuItems = (canSeeMenu ? (itemsResult.data || []) : []).map((row: any) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id || '',
    description: row.description || '',
    price: Number(row.sale_price),
    available: Boolean(row.available),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || actor.profile.id,
  }))

  const orders = actor.profile.role === 'superadmin' || actor.permissions['orders.view'] ? (ordersResult.data || []) : []
  const orderIds = orders.map((row: any) => row.id)
  let orderItems: any[] = []
  if (orderIds.length) {
    const result = await admin.from('order_items').select('*').in('order_id', orderIds).order('created_at')
    if (result.error) throw new Error(result.error.message)
    orderItems = result.data || []
  }
  const tableMap = new Map((tablesResult.data || []).map((row: any) => [row.id, row]))
  const ongoingOrders = orders.map((row: any) => {
    const table = tableMap.get(row.table_id) as any
    return {
      id: row.id,
      orderNumber: Number(row.order_number),
      tableNumber: table?.display_name || `Table ${String(table?.table_number || '01').padStart(2, '0')}`,
      lines: orderItems.filter((item) => item.order_id === row.id).map((item) => ({
        itemId: item.menu_item_id || `snapshot_${item.id}`,
        name: item.item_name_snapshot,
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
      })),
      discount: Number(row.discount_amount),
      paymentMethod: row.payment_method || 'Cash',
      subtotal: Number(row.subtotal),
      total: Number(row.total_amount),
      status: 'KOT sent',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }
  })

  const settingsRow = settingsResult.data
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
        restaurantName: settingsRow?.restaurant_name || organisationResult.data.name,
        branchName: settingsRow?.branch_name || branchResult.data.name,
        currencyCode: settingsRow?.currency_code || branchResult.data.currency_code,
        timezone: settingsRow?.timezone || branchResult.data.timezone,
        address: settingsRow?.address || branchResult.data.address || '',
      },
    },
    currentUserId: actor.profile.id,
  }
}

async function createEntry(admin: any, actor: any, payload: any) {
  const kind = payload.kind === 'cost' ? 'cost' : 'sale'
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.')

  if (kind === 'sale') {
    requirePermission(actor, 'sales.create')
    const { data, error } = await admin.from('sales').insert({
      organisation_id: actor.profile.organisation_id,
      branch_id: actor.profile.default_branch_id,
      subtotal: amount,
      discount_type: 'fixed',
      discount_value: 0,
      discount_amount: 0,
      total_amount: amount,
      payment_method: payload.paymentMethod || 'Cash',
      note: String(payload.note || ''),
      completed_by: actor.profile.id,
      completed_at: payload.occurredAt || new Date().toISOString(),
      updated_by: actor.profile.id,
    }).select('*').single()
    if (error) throw new Error(error.message)
    try {
      await uploadAttachment(admin, actor, 'sale', data.id, payload.attachmentName, payload.attachmentDataUrl)
    } catch (uploadError) {
      await admin.from('sales').delete().eq('id', data.id)
      throw uploadError
    }
    return mapSaleRow(data)
  }

  requirePermission(actor, 'costs.create')
  const category = await ensureCostCategory(admin, actor.profile.organisation_id, payload.category)
  const { data, error } = await admin.from('costs').insert({
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    category_id: category.id,
    category_name_snapshot: category.name,
    amount,
    description: String(payload.description || ''),
    occurred_at: payload.occurredAt || new Date().toISOString(),
    created_by: actor.profile.id,
    updated_by: actor.profile.id,
  }).select('*').single()
  if (error) throw new Error(error.message)
  try {
    await uploadAttachment(admin, actor, 'cost', data.id, payload.attachmentName, payload.attachmentDataUrl)
  } catch (uploadError) {
    await admin.from('costs').delete().eq('id', data.id)
    throw uploadError
  }
  return mapCostRow(data)
}

async function updateEntry(admin: any, actor: any, payload: any) {
  const reason = String(payload.reason || '').trim()
  if (!reason) throw new Error('Write a reason before saving this edit.')
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.')

  const saleResult = await admin.from('sales').select('*').eq('id', payload.id).eq('organisation_id', actor.profile.organisation_id).eq('branch_id', actor.profile.default_branch_id).maybeSingle()
  if (saleResult.error) throw new Error(saleResult.error.message)
  if (saleResult.data) {
    requirePermission(actor, 'sales.edit')
    const original = saleResult.data
    if (actor.profile.role === 'reception') {
      const age = Date.now() - new Date(original.completed_at).getTime()
      if (Number(original.edit_count) >= 2 || age > 24 * 60 * 60 * 1000) throw new Error('Reception users can edit an entry only twice and only within 24 hours.')
    }
    const { data: updated, error } = await admin.from('sales').update({
      subtotal: amount,
      total_amount: amount,
      payment_method: payload.paymentMethod || 'Cash',
      note: String(payload.note || ''),
      completed_at: payload.occurredAt,
      edit_count: Number(original.edit_count) + 1,
      updated_by: actor.profile.id,
    }).eq('id', original.id).select('*').single()
    if (error) throw new Error(error.message)
    const auditResult = await admin.from('entry_audits').insert({
      organisation_id: actor.profile.organisation_id,
      branch_id: actor.profile.default_branch_id,
      entity_kind: 'sale',
      entity_id: original.id,
      previous_data: original,
      updated_data: updated,
      reason,
      edited_by: actor.profile.id,
      edit_number: updated.edit_count,
    })
    if (auditResult.error) {
      await admin.from('sales').update({
        subtotal: original.subtotal,
        discount_type: original.discount_type,
        discount_value: original.discount_value,
        discount_amount: original.discount_amount,
        total_amount: original.total_amount,
        payment_method: original.payment_method,
        note: original.note,
        completed_at: original.completed_at,
        edit_count: original.edit_count,
        updated_by: original.updated_by,
      }).eq('id', original.id)
      throw new Error(`The edit was cancelled because audit logging failed: ${auditResult.error.message}`)
    }
    await uploadAttachment(admin, actor, 'sale', original.id, payload.attachmentName, payload.attachmentDataUrl)
    return mapSaleRow(updated)
  }

  const costResult = await admin.from('costs').select('*').eq('id', payload.id).eq('organisation_id', actor.profile.organisation_id).eq('branch_id', actor.profile.default_branch_id).maybeSingle()
  if (costResult.error) throw new Error(costResult.error.message)
  if (!costResult.data) throw new Error('The entry could not be found.')
  requirePermission(actor, 'costs.edit')
  const original = costResult.data
  if (actor.profile.role === 'reception') {
    const age = Date.now() - new Date(original.occurred_at).getTime()
    if (Number(original.edit_count) >= 2 || age > 24 * 60 * 60 * 1000) throw new Error('Reception users can edit an entry only twice and only within 24 hours.')
  }
  const category = await ensureCostCategory(admin, actor.profile.organisation_id, payload.category)
  const { data: updated, error } = await admin.from('costs').update({
    category_id: category.id,
    category_name_snapshot: category.name,
    amount,
    description: String(payload.description || ''),
    occurred_at: payload.occurredAt,
    edit_count: Number(original.edit_count) + 1,
    updated_by: actor.profile.id,
  }).eq('id', original.id).select('*').single()
  if (error) throw new Error(error.message)
  const auditResult = await admin.from('entry_audits').insert({
    organisation_id: actor.profile.organisation_id,
    branch_id: actor.profile.default_branch_id,
    entity_kind: 'cost',
    entity_id: original.id,
    previous_data: original,
    updated_data: updated,
    reason,
    edited_by: actor.profile.id,
    edit_number: updated.edit_count,
  })
  if (auditResult.error) {
    await admin.from('costs').update({
      category_id: original.category_id,
      category_name_snapshot: original.category_name_snapshot,
      amount: original.amount,
      description: original.description,
      occurred_at: original.occurred_at,
      edit_count: original.edit_count,
      updated_by: original.updated_by,
    }).eq('id', original.id)
    throw new Error(`The edit was cancelled because audit logging failed: ${auditResult.error.message}`)
  }
  await uploadAttachment(admin, actor, 'cost', original.id, payload.attachmentName, payload.attachmentDataUrl)
  return mapCostRow(updated)
}

async function saveUserPermissions(admin: any, actorId: string, profileId: string, permissions: Record<string, boolean>) {
  await ensurePermissionCatalog(admin)
  const selectedKeys = permissionKeys.filter((key) => Boolean(permissions?.[key]))
  const { error: deleteError } = await admin.from('profile_permissions').delete().eq('profile_id', profileId)
  if (deleteError) throw new Error(deleteError.message)
  if (!selectedKeys.length) return
  const { data: permissionRows, error: permissionError } = await admin.from('permissions').select('id, permission_key').in('permission_key', selectedKeys)
  if (permissionError) throw new Error(permissionError.message)
  const rows = (permissionRows || []).map((permission: any) => ({ profile_id: profileId, permission_id: permission.id, allowed: true, granted_by: actorId }))
  const { error: insertError } = await admin.from('profile_permissions').insert(rows)
  if (insertError) throw new Error(insertError.message)
}

async function getEntityAttachmentPaths(admin: any, kind: 'sale' | 'cost', entityId: string) {
  const { data, error } = await admin
    .from('entry_attachments')
    .select('storage_bucket, storage_path')
    .eq('entity_kind', kind)
    .eq('entity_id', entityId)
  if (error) throw new Error(error.message)
  return data || []
}

async function removeStoredAttachments(admin: any, rows: any[]) {
  for (const row of rows) {
    await admin.storage.from(row.storage_bucket || attachmentBucket).remove([row.storage_path])
  }
}


async function handleAction(admin: any, db: any, actor: any, action: string, payload: any) {
  const organisationId = actor.profile.organisation_id
  const branchId = actor.profile.default_branch_id
  if (!branchId) throw new Error('Your account has no default branch assigned.')

  if (action === 'create_entry') return createEntry(admin, actor, payload)
  if (action === 'update_entry') return updateEntry(admin, actor, payload)

  if (action === 'delete_cost') {
    requirePermission(actor, 'costs.remove')
    const attachmentPaths = await getEntityAttachmentPaths(admin, 'cost', payload.id)
    const { data, error } = await db.rpc('delete_cost', { p_cost_id: payload.id, p_pin: String(payload.pin || '') })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.message || 'The cost entry could not be deleted.')
    await removeStoredAttachments(admin, attachmentPaths)
    return data
  }

  if (action === 'create_menu_category') {
    requirePermission(actor, 'menu.categories.create')
    const name = String(payload.name || '').trim()
    if (!name) throw new Error('Enter a category name.')
    const { error } = await db.from('menu_categories').insert({ branch_id: branchId, name, active: true, created_by: actor.profile.id, updated_by: actor.profile.id })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'delete_menu_category') {
    requirePermission(actor, 'menu.categories.remove')
    const { data, error } = await db.rpc('delete_menu_category', { p_category_id: payload.id, p_pin: String(payload.pin || '') })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.message || 'The menu category could not be deleted.')
    return data
  }

  if (action === 'create_menu_item') {
    requirePermission(actor, 'menu.items.create')
    const name = String(payload.name || '').trim()
    const price = Number(payload.price)
    if (!name) throw new Error('Enter a menu item name.')
    if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid price.')
    const { error } = await db.from('menu_items').insert({
      branch_id: branchId,
      category_id: payload.categoryId || null,
      name,
      description: String(payload.description || ''),
      sale_price: price,
      available: Boolean(payload.available),
      active: true,
      created_by: actor.profile.id,
      updated_by: actor.profile.id,
    })
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'update_menu_item') {
    requirePermission(actor, 'menu.items.edit')
    const { error } = await db.from('menu_items').update({
      category_id: payload.categoryId || null,
      name: String(payload.name || '').trim(),
      description: String(payload.description || ''),
      sale_price: Number(payload.price),
      available: Boolean(payload.available),
      updated_by: actor.profile.id,
    }).eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'toggle_menu_item') {
    requirePermission(actor, 'menu.items.availability')
    const { error } = await db.from('menu_items').update({ available: Boolean(payload.available), updated_by: actor.profile.id }).eq('id', payload.id).eq('branch_id', branchId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  if (action === 'delete_menu_item') {
    requirePermission(actor, 'menu.items.remove')
    const { data, error } = await db.rpc('delete_menu_item', { p_menu_item_id: payload.id, p_pin: String(payload.pin || '') })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.message || 'The menu item could not be deleted.')
    return data
  }

  if (action === 'create_order') {
    requirePermission(actor, 'sales.create')
    requirePermission(actor, 'sales.printKot')
    const lines = Array.isArray(payload.lines) ? payload.lines : []
    if (!lines.length) throw new Error('Add at least one food item.')
    const table = await resolveTable(admin, branchId, payload.tableNumber)
    const { data: order, error: orderError } = await admin.from('orders').insert({
      organisation_id: organisationId,
      branch_id: branchId,
      table_id: table.id,
      status: 'kot_sent',
      payment_method: payload.paymentMethod || 'Cash',
      subtotal: Number(payload.subtotal),
      discount_type: 'fixed',
      discount_value: Number(payload.discount || 0),
      discount_amount: Number(payload.discount || 0),
      total_amount: Number(payload.total),
      note: null,
      kot_printed_at: new Date().toISOString(),
      created_by: actor.profile.id,
      updated_by: actor.profile.id,
    }).select('*').single()
    if (orderError) throw new Error(orderError.message)
    const orderRows = lines.map((line: any) => ({
      order_id: order.id,
      menu_item_id: typeof line.itemId === 'string' && !line.itemId.startsWith('snapshot_') ? line.itemId : null,
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
    await logAudit(admin, actor, 'order.kot_sent', 'order', order.id, null, order, { order_number: order.order_number })
    return {
      id: order.id,
      orderNumber: Number(order.order_number),
      tableNumber: table.display_name,
      lines,
      discount: Number(order.discount_amount),
      paymentMethod: order.payment_method,
      subtotal: Number(order.subtotal),
      total: Number(order.total_amount),
      status: 'KOT sent',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      createdBy: actor.profile.id,
    }
  }

  if (action === 'update_order') {
    requirePermission(actor, 'orders.edit')
    const { data: existing, error: fetchError } = await admin.from('orders').select('*').eq('id', payload.id).eq('organisation_id', organisationId).eq('branch_id', branchId).in('status', ['draft', 'kot_sent']).maybeSingle()
    if (fetchError) throw new Error(fetchError.message)
    if (!existing) throw new Error('The order could not be found.')
    const table = await resolveTable(admin, branchId, payload.tableNumber)
    const { error: updateError } = await admin.from('orders').update({
      table_id: table.id,
      payment_method: payload.paymentMethod || 'Cash',
      subtotal: Number(payload.subtotal),
      discount_type: 'fixed',
      discount_value: Number(payload.discount || 0),
      discount_amount: Number(payload.discount || 0),
      total_amount: Number(payload.total),
      updated_by: actor.profile.id,
    }).eq('id', payload.id)
    if (updateError) throw new Error(updateError.message)
    const { error: deleteError } = await admin.from('order_items').delete().eq('order_id', payload.id)
    if (deleteError) throw new Error(deleteError.message)
    const lines = Array.isArray(payload.lines) ? payload.lines : []
    if (lines.length) {
      const { error: insertError } = await admin.from('order_items').insert(lines.map((line: any) => ({
        order_id: payload.id,
        menu_item_id: typeof line.itemId === 'string' && !line.itemId.startsWith('snapshot_') ? line.itemId : null,
        item_name_snapshot: line.name,
        quantity: Number(line.quantity),
        unit_price: Number(line.price),
        line_total: Number(line.price) * Number(line.quantity),
      })))
      if (insertError) throw new Error(insertError.message)
    }
    await logAudit(admin, actor, 'order.updated', 'order', existing.id, existing, { ...existing, table_id: table.id, total_amount: Number(payload.total) })
    return { success: true }
  }

  if (action === 'complete_sale') {
    requirePermission(actor, 'sales.create')
    requirePermission(actor, 'sales.printBill')
    return createEntry(admin, actor, { ...payload, kind: 'sale' })
  }

  if (action === 'complete_order') {
    requirePermission(actor, 'sales.create')
    requirePermission(actor, 'sales.printBill')
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', payload.orderId).eq('organisation_id', organisationId).eq('branch_id', branchId).in('status', ['draft', 'kot_sent']).maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) throw new Error('The order could not be found.')
    const { data: table, error: tableError } = await admin.from('restaurant_tables').select('*').eq('id', order.table_id).single()
    if (tableError) throw new Error(tableError.message)
    const { data: items, error: itemFetchError } = await admin.from('order_items').select('*').eq('order_id', order.id)
    if (itemFetchError) throw new Error(itemFetchError.message)
    const completedAt = payload.sale?.occurredAt || new Date().toISOString()
    const paymentMethod = payload.sale?.paymentMethod || order.payment_method
    const { data: sale, error: saleError } = await admin.from('sales').insert({
      organisation_id: organisationId,
      branch_id: branchId,
      order_id: order.id,
      order_number_snapshot: order.order_number,
      table_number_snapshot: table.display_name,
      subtotal: order.subtotal,
      discount_type: order.discount_type,
      discount_value: order.discount_value,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      payment_method: paymentMethod,
      note: String(payload.sale?.note || order.note || ''),
      completed_by: actor.profile.id,
      completed_at: completedAt,
      updated_by: actor.profile.id,
    }).select('*').single()
    if (saleError) throw new Error(saleError.message)
    if ((items || []).length) {
      const { error: saleItemsError } = await admin.from('sale_items').insert((items || []).map((item: any) => ({
        sale_id: sale.id,
        menu_item_id: item.menu_item_id,
        item_name_snapshot: item.item_name_snapshot,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })))
      if (saleItemsError) {
        await admin.from('sales').delete().eq('id', sale.id)
        throw new Error(saleItemsError.message)
      }
    }
    const { error: closeError } = await admin.from('orders').update({ status: 'paid', payment_method: paymentMethod, paid_at: completedAt, updated_by: actor.profile.id }).eq('id', order.id)
    if (closeError) {
      await admin.from('sales').delete().eq('id', sale.id)
      throw new Error(closeError.message)
    }
    await logAudit(admin, actor, 'order.completed', 'order', order.id, order, { ...order, status: 'paid' }, { sale_id: sale.id })
    return mapSaleRow(sale)
  }

  if (action === 'save_settings') {
    requirePermission(actor, 'settings.manage')
    const settings = payload.settings || {}
    const restaurantName = String(settings.restaurantName || '').trim()
    const branchName = String(settings.branchName || '').trim()
    const currencyCode = String(settings.currencyCode || 'BDT').toUpperCase().slice(0, 3)
    const timezone = String(settings.timezone || 'Asia/Dhaka')
    const address = String(settings.address || '')
    const organisationUpdate = await db.from('organisations').update({ name: restaurantName }).eq('id', organisationId)
    if (organisationUpdate.error) throw new Error(organisationUpdate.error.message)
    const branchUpdate = await db.from('branches').update({ name: branchName, currency_code: currencyCode, timezone, address }).eq('id', branchId)
    if (branchUpdate.error) throw new Error(branchUpdate.error.message)
    const settingsUpdate = await db.from('branch_settings').update({
      restaurant_name: restaurantName,
      branch_name: branchName,
      currency_code: currencyCode,
      timezone,
      address,
      updated_by: actor.profile.id,
    }).eq('branch_id', branchId)
    if (settingsUpdate.error) throw new Error(settingsUpdate.error.message)
    return { success: true }
  }

  if (action === 'save_deletion_pin') {
    const newPin = String(payload.newPin || '')
    if (!/^\d{4}$/.test(newPin)) throw new Error('The deletion PIN must contain exactly 4 digits.')
    const { data, error } = await db.rpc('set_my_deletion_pin', {
      p_new_pin: newPin,
      p_current_pin: String(payload.currentPin || '') || null,
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.message || 'The deletion PIN could not be saved.')
    return data
  }

  if (action === 'create_user') {
    requireSuperadmin(actor)
    const email = String(payload.email || '').trim().toLowerCase()
    const name = String(payload.name || '').trim()
    const password = String(payload.password || '')
    const role = ['reception', 'manager', 'admin'].includes(payload.role) ? payload.role : 'reception'
    if (!name || !email) throw new Error('Name and email are required.')
    if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
    const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
    if (authError || !created.user) throw new Error(authError?.message || 'The user could not be created.')
    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      organisation_id: organisationId,
      default_branch_id: branchId,
      full_name: name,
      email,
      role,
      active: true,
      can_change_password: false,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      throw new Error(profileError.message)
    }
    try {
      await saveUserPermissions(admin, actor.profile.id, created.user.id, payload.permissions || {})
    } catch (permissionError) {
      await admin.from('profiles').delete().eq('id', created.user.id)
      await admin.auth.admin.deleteUser(created.user.id)
      throw permissionError
    }
    return { success: true }
  }

  if (action === 'update_user') {
    requireSuperadmin(actor)
    const { data: target, error: targetError } = await admin.from('profiles').select('*').eq('id', payload.id).eq('organisation_id', organisationId).maybeSingle()
    if (targetError) throw new Error(targetError.message)
    if (!target) throw new Error('The user could not be found.')
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
    const { data: target, error: targetError } = await admin.from('profiles').select('id').eq('id', payload.id).eq('organisation_id', organisationId).maybeSingle()
    if (targetError) throw new Error(targetError.message)
    if (!target) throw new Error('The user could not be found.')
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

  const admin = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = getBearerToken(req)
  const db = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  try {
    const actor = await getActor(admin, req)
    if (req.method === 'GET') return send(res, 200, { data: await bootstrap(admin, actor) })
    const body = parseBody(req)
    return send(res, 200, { data: await handleAction(admin, db, actor, String(body.action || ''), body.payload || {}) })
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
