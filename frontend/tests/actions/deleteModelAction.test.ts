// @ts-nocheck
import { deleteModelAction } from '@/app/(authorized)/models/actions'
import prisma from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { deletePredictionJobs } from '@/lib/predictions'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    model: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    dataFeed: {
      deleteMany: jest.fn(),
    },
    dataImport: {
      deleteMany: jest.fn(),
    },
    prediction: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback),
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/predictions', () => ({
  deletePredictionJobs: jest.fn(),
}))

describe('akcja usuwania modelu', () => {
  const mockUserId = 'user_123'
  const mockModelId = 'model_123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('zwraca błąd gdy nie podano id', async () => {
    const result = await deleteModelAction('')
    expect(result).toEqual({ error: 'Brak id' })
  })

  it('zwraca błąd gdy użytkownik niejest uwierzytelniony', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null })
    const result = await deleteModelAction(mockModelId)
    expect(result).toEqual({ error: 'Brak uprawnień' })
  })

  it('zwraca błąd gdy model nie istnieje lub użytkownik nie jest właścicielem', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId })
    ;(prisma.model.findFirst as jest.Mock).mockResolvedValue(null)

    const result = await deleteModelAction(mockModelId)
    expect(result).toEqual({ error: 'Model nie istnieje lub brak uprawnień' })
  })

  it('usuwa model i powiązane dane pomyślnie', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId })
    ;(prisma.model.findFirst as jest.Mock).mockResolvedValue({ id: mockModelId })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (args) => args)

    const result = await deleteModelAction(mockModelId)

    expect(prisma.model.findFirst).toHaveBeenCalledWith({
      where: { id: mockModelId, ownerId: mockUserId },
      select: { id: true },
    })
    
    expect(prisma.dataFeed.deleteMany).toHaveBeenCalledWith({ where: { modelId: mockModelId } })
    expect(prisma.dataImport.deleteMany).toHaveBeenCalledWith({ where: { modelId: mockModelId } })
    expect(prisma.prediction.deleteMany).toHaveBeenCalledWith({ where: { modelId: mockModelId } })
    expect(prisma.model.delete).toHaveBeenCalledWith({ where: { id: mockModelId } })

    expect(deletePredictionJobs).toHaveBeenCalledWith(mockModelId)
    expect(revalidatePath).toHaveBeenCalledWith('/models')
    expect(result).toEqual({ ok: true })
  })

  it('obsługuje błędy podczas usuwania', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId })
    ;(prisma.model.findFirst as jest.Mock).mockResolvedValue({ id: mockModelId })
    ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB Error'))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await deleteModelAction(mockModelId)
    
    expect(result).toEqual({ error: 'Nie udało się usunąć modelu' })
    expect(consoleSpy).toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })
})
