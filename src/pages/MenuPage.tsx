import {
  CakeSlice,
  Check,
  CupSoda,
  Drumstick,
  Edit3,
  Grid2X2,
  Pizza,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
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

const categoryIcons = [ShoppingBag, Pizza, Drumstick, CupSoda, CakeSlice, UtensilsCrossed]

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
        <label className="field"><span>Item name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Burger 4" autoFocus /></label>
        <label className="field"><span>Category</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorised</option>{categories.filter((category) => category.active).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span>Price</span><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" /></label>
        <label className="switch-field"><span>Available for sale</span><label className="switch-label"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /><span className="switch" /><em>{available ? 'Available' : 'Unavailable'}</em></label></label>
        <label className="field field-full"><span>Description</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional food details" /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button primary" type="submit">{item ? 'Save changes' : 'Add menu item'}</button></div>
    </form>
  )
}

export function MenuPage({ categories, items, currency, canManage, currentUserId, onCategoriesChange, onItemsChange, onNotify }: MenuPageProps) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categoryName, setCategoryName] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory
    const matchesQuery = `${item.name} ${item.description} ${categoryMap.get(item.categoryId) ?? ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  }), [items, query, categoryMap, selectedCategory])

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
    onNotify(item.available ? 'Menu item marked unavailable.' : 'Menu item marked available.')
  }

  const deleteItem = (item: MenuItem) => {
    if (!window.confirm(`Delete ${item.name} from the menu?`)) return
    onItemsChange(items.filter((current) => current.id !== item.id))
    onNotify('Menu item deleted.')
  }

  return (
    <div className="page-stack menu-management-page">
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">Menu management</span><h1>Food menu</h1><p>Manage categories, prices and availability. These foods appear directly on the Sales page.</p></div>
        {canManage && <div className="heading-actions"><button className="button secondary" type="button" onClick={() => setShowCategoryForm((value) => !value)}><Plus size={18} /> Add category</button><button className="button primary" type="button" onClick={() => { setEditingItem(null); setShowItemForm(true) }}><Plus size={18} /> Add menu item</button></div>}
      </section>

      {showCategoryForm && canManage && <section className="content-card inline-form-card"><form className="category-form" onSubmit={addCategory}><label className="field"><span>Category name</span><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Example: Seafood" autoFocus /></label><button className="button primary" type="submit"><Check size={17} /> Save category</button></form></section>}

      <section className="menu-category-board">
        <div className="menu-section-title"><div><span className="eyebrow">Categories</span><h2>Browse foods by category</h2></div><span className="section-count">{categories.length} categories</span></div>
        <div className="menu-category-cards">
          <button type="button" className={`menu-category-tile ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}><span><Grid2X2 size={25} /></span><strong>All</strong><small>{items.length} items</small></button>
          {categories.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length]
            return <button type="button" className={`menu-category-tile ${selectedCategory === category.id ? 'active' : ''} ${category.active ? '' : 'inactive'}`} onClick={() => setSelectedCategory(category.id)} key={category.id}><span><Icon size={25} /></span><strong>{category.name}</strong><small>{items.filter((item) => item.categoryId === category.id).length} items</small></button>
          })}
        </div>
      </section>

      <section className="content-card menu-table-card">
        <div className="menu-table-heading">
          <div><span className="eyebrow">Menu items</span><h2>{selectedCategory === 'all' ? 'All foods' : categoryMap.get(selectedCategory)}</h2></div>
          <div className="menu-table-tools"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu items" /></div><span className="section-count">{filteredItems.length} items</span></div>
        </div>

        {!filteredItems.length ? <EmptyState title={items.length ? 'No matching menu items' : 'No menu items added yet'} description={items.length ? 'Try a different search term or category.' : 'Use Add category and Add menu item to build the restaurant menu.'} /> : <div className="table-shell"><table className="menu-management-table"><thead><tr><th>Product</th><th>Product name</th><th>Item ID</th><th>Category</th><th>Price</th><th>Availability</th>{canManage && <th>Actions</th>}</tr></thead><tbody>{filteredItems.map((item) => <tr key={item.id}>
          <td><span className="menu-product-icon"><UtensilsCrossed size={20} /></span></td>
          <td><div className="menu-product-copy"><strong>{item.name}</strong><span>{item.description || 'No description added.'}</span></div></td>
          <td><code>{item.id.replace('menu-', '').slice(0, 12).toUpperCase()}</code></td>
          <td>{categoryMap.get(item.categoryId) ?? 'Uncategorised'}</td>
          <td className="menu-price-cell">{formatCurrency(item.price, currency)}</td>
          <td><button type="button" className={`availability-badge table-badge ${item.available ? 'available' : ''}`} onClick={() => canManage && toggleAvailability(item)} disabled={!canManage}>{item.available ? 'In stock' : 'Unavailable'}</button></td>
          {canManage && <td className="actions-cell"><button className="icon-button subtle" type="button" onClick={() => { setEditingItem(item); setShowItemForm(true) }} aria-label="Edit menu item"><Edit3 size={16} /></button><button className="icon-button subtle danger-text" type="button" onClick={() => deleteItem(item)} aria-label="Delete menu item"><Trash2 size={16} /></button></td>}
        </tr>)}</tbody></table></div>}
      </section>

      {showItemForm && canManage && <Modal title={editingItem ? 'Edit menu item' : 'Add menu item'} onClose={() => { setShowItemForm(false); setEditingItem(null) }}><MenuItemForm categories={categories} item={editingItem ?? undefined} onSubmit={saveItem} onCancel={() => { setShowItemForm(false); setEditingItem(null) }} /></Modal>}
    </div>
  )
}
