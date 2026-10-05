export const isCompletedTransaction = ({ status }: { status?: string }) =>
    status !== 'pending' && status !== 'failed'
