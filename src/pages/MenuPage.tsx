import { Check, Edit3, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { formatCurrency, randomId } from '../lib/utils'
import type { MenuCategory, MenuItem } from '../types'

interface MenuPageProps {
  categories: MenuCategory[]
  items: MenuItem[]
  currency: string
  canManage: boolean
  currentUserId: string
  onCategoriesChange: (categories: MenuCategory[]) => void
  onItemsChange: (items: MenuItem[]) => void
  onNotify: (message: string) => void
}

interface MenuItemFormProps {
  categories: MenuCategory[]
  item?: MenuItem
  onSubmit: (data: Pick<MenuItem, 'name' | 'categoryId' | 'description' | 'price' | 'available'>) => void
  onCancel: () => void
}

function MenuItemForm({ categories, item, onSubmit, onCancel }: MenuItemFormProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const numericPrice = Number(price)
    if (!name.trim()) return setError('Enter the menu item name.')
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return setError('Enter a valid price.')
    onSubmit({ name: name.trim(), categoryId, description: description.trim(), price: numericPrice, available })
  }

  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Item name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Chicken biryani" autoFocus /></label>
        <label className="field"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorised</option>{categories.filter((category) => category.active).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span>Price</span><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" /></label>
        <label className="switch-field"><span>Available for sale</span><label className="switch-label"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /><span className="switch" /><em>{available ? 'Available' : 'Unavailable'}</em></label></label>
        <label className="field field-full"><span>Description</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional item details" /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit">{item ? 'Save changes' : 'Add menu item'}</button></div>
    </form>
  )
}

export function MenuPage({ categories, items, currency, canManage, currentUserId, onCategoriesChange, onItemsChange, onNotify }: MenuPageProps) {
  const [query, setQuery] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const filteredItems = useMemo(() => items.filter((item) => `${item.name} ${item.description} ${categoryMap.get(item.categoryId) ?? ''}`.toLowerCase().includes(query.toLowerCase())), [items, query, categoryMap])

  const addCategory = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = categoryName.trim()
    if (!cleanName) return
    if (categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase())) return onNotify('A category with this name already exists.')
    onCategoriesChange([...categories, { id: randomId('category'), name: cleanName, active: true, createdAt: new Date().toISOString(), createdBy: currentUserId }])
    setCategoryName('')
    setShowCategoryForm(false)
    onNotify('Menu category added.')
  }

  const saveItem = (data: Pick<MenuItem, 'name' | 'categoryId' | 'description' | 'price' | 'available'>) => {
    const now = new Date().toISOString()
    if (editingItem) {
      onItemsChange(items.map((item) => item.id === editingItem.id ? { ...item, ...data, updatedAt: now } : item))
      onNotify('Menu item updated.')
    } else {
      onItemsChange([{ ...data, id: randomId('menu'), createdAt: now, updatedAt: now, createdBy: currentUserId }, ...items])
      onNotify('Menu item added.')
    }
    setEditingItem(null)
    setShowItemForm(false)
  }

  const toggleAvailability = (item: MenuItem) => {
    onItemsChange(items.map((current) => current.id === item.id ? { ...current, available: !current.available, updatedAt: new Date().toISOString() } : current))
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">Menu management</span><h1>Food menu</h1><p>Add categories and menu items without enabling the complete order system yet.</p></div>
        {canManage && <div className="heading-actions"><button className="button secondary" type="button" onClick={() => setShowCategoryForm((value) => !value)}><Plus size={18} /> Add category</button><button className="button primary" type="button" onClick={() => { setEditingItem(null); setShowItemForm(true) }}><Plus size={18} /> Add menu item</button></div>}
      </section>

      {showCategoryForm && canManage && <section className="content-card inline-form-card"><form className="category-form" onSubmit={addCategory}><label className="field"><span>Category name</span><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Example: Main course" autoFocus /></label><button className="button primary" type="submit"><Check size={17} /> Save category</button></form></section>}

      <section className="menu-category-strip">
        <span className="menu-category-chip active">All items <strong>{items.length}</strong></span>
        {categories.map((category) => <span className={`menu-category-chip ${category.active ? '' : 'inactive'}`} key={category.id}>{category.name} <strong>{items.filter((item) => item.categoryId === category.id).length}</strong></span>)}
      </section>

      <section className="content-card">
        <div className="table-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu items" /></div><span className="section-count">{filteredItems.length} items</span></div>
        {!filteredItems.length ? <EmptyState title={items.length ? 'No matching menu items' : 'No menu items added yet'} description={items.length ? 'Try a different search term.' : 'Use Add category and Add menu item to build the restaurant menu.'} /> : (
          <div className="menu-grid">
            {filteredItems.map((item) => <article className={`menu-card ${item.available ? '' : 'unavailable'}`} key={item.id}>
              <div className="menu-card-icon"><UtensilsCrossed size={22} /></div>
              <div className="menu-card-main"><span className="menu-card-category">{categoryMap.get(item.categoryId) ?? 'Uncategorised'}</span><h3>{item.name}</h3><p>{item.description || 'No description added.'}</p></div>
              <div className="menu-card-footer"><strong>{formatCurrency(item.price, currency)}</strong><span className={`availability-badge ${item.available ? 'available' : ''}`}>{item.available ? 'Available' : 'Unavailable'}</span></div>
              {canManage && <div className="menu-card-actions"><button className="icon-button subtle" type="button" onClick={() => { setEditingItem(item); setShowItemForm(true) }} aria-label="Edit menu item"><Edit3 size={16} /></button><button className="button secondary mini-button" type="button" onClick={() => toggleAvailability(item)}>{item.available ? 'Mark unavailable' : 'Mark available'}</button></div>}
            </article>)}
          </div>
        )}
      </section>

      {showItemForm && canManage && <Modal title={editingItem ? 'Edit menu item' : 'Add menu item'} onClose={() => { setShowItemForm(false); setEditingItem(null) }}><MenuItemForm categories={categories} item={editingItem ?? undefined} onSubmit={saveItem} onCancel={() => { setShowItemForm(false); setEditingItem(null) }} /></Modal>}
    </div>
  )
}
