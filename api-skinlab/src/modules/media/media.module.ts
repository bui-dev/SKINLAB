import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { CreateReadGrant } from "./application/create-read-grant";
import { StorePrivateObject } from "./application/store-private-object";
import { S3ObjectStore } from "./infrastructure/s3-object-store";

@Module({
  imports: [AuditModule],
  providers: [
    {
      provide: S3ObjectStore,
      useFactory: () => new S3ObjectStore(),
    },
    StorePrivateObject,
    CreateReadGrant,
  ],
  exports: [S3ObjectStore, StorePrivateObject, CreateReadGrant],
})
export class MediaModule {}
