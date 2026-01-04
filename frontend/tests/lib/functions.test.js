const mockPrisma = {
  customFunction: {
    create: jest.fn().mockResolvedValue({ id: 'created' }),
    delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    findUnique: jest.fn().mockResolvedValue({ id: '1', userId: 'u1' }),
    findMany: jest.fn().mockResolvedValue([{ id: '1' }]),
    update: jest.fn().mockResolvedValue({ id: '1', name: 'updated' }),
  },
}

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

const {
  createFunction,
  deleteFunction,
  deleteUserFunction,
  getFunction,
  listFunctions,
  updateFunction,
} = require('@/lib/functions')

describe('Funkcje CRUD dla customFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('createFunction zapisuje poprawne dane', async () => {
    const data = { name: 'n', body: 'x' }
    const res = await createFunction(data, 'u1')
    expect(mockPrisma.customFunction.create).toHaveBeenCalled()
    expect(res).toEqual({ id: 'created' })
  })

  test('deleteFunction wywołuje prisma.delete z where', async () => {
    await deleteFunction('i1', 'u1')
    expect(mockPrisma.customFunction.delete).toHaveBeenCalledWith({ where: { id: 'i1', userId: 'u1' } })
  })

  test('deleteUserFunction wyrzuca gdy brak userId', async () => {
    await expect(deleteUserFunction('i1', null)).rejects.toThrow()
  })

  test('deleteUserFunction usuwa gdy własność pasuje', async () => {
    mockPrisma.customFunction.findUnique.mockResolvedValueOnce({ id: 'i1', userId: 'u1' })
    await deleteUserFunction('i1', 'u1')
    expect(mockPrisma.customFunction.delete).toHaveBeenCalledWith({ where: { id: 'i1' } })
  })

  test('getFunction zwraca wynik findUnique', async () => {
    await getFunction('i1', 'u1')
    expect(mockPrisma.customFunction.findUnique).toHaveBeenCalledWith({ where: { id: 'i1', userId: 'u1' } })
  })

  test('listFunctions wywołuje findMany z poprawnym where', async () => {
    await listFunctions('u1')
    expect(mockPrisma.customFunction.findMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' } })
  })

  test('updateFunction waliduje i wywołuje update', async () => {
    const data = { name: 'updated' }
    await updateFunction('i1', data, 'u1')
    expect(mockPrisma.customFunction.update).toHaveBeenCalledWith({ where: { id: 'i1', userId: 'u1' }, data: expect.objectContaining({ name: 'updated', userId: 'u1' }) })
  })
})
