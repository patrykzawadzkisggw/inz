const mockPrisma = {
  widget: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('@/lib/prisma', () => mockPrisma)

const {
  uiToDbType,
  dbToUiType,
  listWidgets,
  createWidget,
  updateWidget,
  bulkUpdateWidgetPositions,
  deleteWidget,
} = require('@/lib/widgets')

describe('biblioteka widżetów', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('konwersje uiToDbType i dbToUiType', () => {
    expect(uiToDbType('tekst')).toBe('TEXT')
    expect(uiToDbType('wykres')).toBe('CHART')
    expect(uiToDbType('tabela')).toBe('TABLE')

    expect(dbToUiType('TEXT')).toBe('tekst')
    expect(dbToUiType('CHART')).toBe('wykres')
    expect(dbToUiType('TABLE')).toBe('tabela')
  })

  test('listWidgets wywołuje prisma.widget.findMany', async () => {
    mockPrisma.widget.findMany.mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
    const rows = await listWidgets('user1')
    expect(mockPrisma.widget.findMany).toHaveBeenCalledWith({ where: { userId: 'user1' }, orderBy: { createdAt: 'asc' } })
    expect(rows).toEqual([{ id: '1' }, { id: '2' }])
  })

  test('createWidget konwertuje typ i ustawia wartości domyślne', async () => {
    const input = {
      userId: 'u1',
      type: 'tekst',
      title: null,
      x: 1, y: 2, w: 3, h: 4,
      content: null,
      content2: undefined,
      configJson: { a: 1 },
    }
    mockPrisma.widget.create.mockResolvedValueOnce({ id: 'new' })

    const created = await createWidget(input)
    expect(mockPrisma.widget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'TEXT',
        title: null,
        x: 1, y: 2, w: 3, h: 4,
        content: '',
        content2: '',
        configJson: { a: 1 },
      }),
    })
    expect(created).toEqual({ id: 'new' })
  })

  test('updateWidget stosuje częściowe aktualizacje i zamienia content null na ""', async () => {
    mockPrisma.widget.update.mockResolvedValueOnce({ id: 'upd' })

    const updated = await updateWidget('id1', { content: null, x: 10 })

    expect(mockPrisma.widget.update).toHaveBeenCalledWith({
      where: { id: 'id1' },
      data: expect.objectContaining({
        x: 10,
        content: '',
      }),
    })
    expect(updated).toEqual({ id: 'upd' })
  })

  test('bulkUpdateWidgetPositions obsługuje puste i przefiltrowane wpisy', async () => {
    const resEmpty = await bulkUpdateWidgetPositions([], 'u1')
    expect(resEmpty).toEqual({ count: 0 })

    const resNoCoords = await bulkUpdateWidgetPositions([{ id: 'a' }, { id: 'b' }], 'u1')
    expect(resNoCoords).toEqual({ count: 0 })

    const txMockResult = [{}, {}]
    mockPrisma.$transaction.mockResolvedValueOnce(txMockResult)

    const res = await bulkUpdateWidgetPositions([
      { id: 'a', x: 1 },
      { id: 'b', y: 2 },
    ], 'u1')

    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(res).toEqual({ count: 2 })
  })

  test('deleteWidget wywołuje prisma.widget.delete', async () => {
    mockPrisma.widget.delete.mockResolvedValueOnce({})
    await deleteWidget('id1', 'u1')
    expect(mockPrisma.widget.delete).toHaveBeenCalledWith({ where: { id: 'id1', userId: 'u1' } })
  })
})
