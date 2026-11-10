import type { PrismaService } from "../../../platform/database/prisma.service";

export type RegisteredDevice = { isActive: boolean };

export class RegisteredDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(fingerprint: string): Promise<RegisteredDevice | null> {
    return this.prisma.registeredDevice.findUnique({
      where: { certificateFingerprint: fingerprint },
      select: { isActive: true },
    });
  }
}
