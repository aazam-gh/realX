import type { OnlineRedemptionConfig } from '@/queries'

export function validateOnlineRedemptionConfig(config: OnlineRedemptionConfig) {
    const destinations = [config.purchaseUrl?.trim(), config.iosUrl?.trim(), config.androidUrl?.trim()]
        .filter((value): value is string => Boolean(value))

    if (destinations.length === 0) {
        throw new Error('Online vendors require at least one HTTPS destination URL.')
    }

    try {
        for (const destination of destinations) {
            const parsed = new URL(destination)
            if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
                throw new Error('Unsafe URL')
            }
        }
    } catch {
        throw new Error('Destinations must be valid HTTPS URLs without embedded credentials.')
    }
}
