import { AdaptGuestStep } from './adapt-guest.step.js';
import { CreateTargetStep } from './create-target.step.js';
import { PrecheckStep } from './precheck.step.js';
import { PrepareSourceStep } from './prepare-source.step.js';
import type { Step } from './step.js';
import { StartTargetStep } from './start-target.step.js';
import { TransferDisksStep } from './transfer-disks.step.js';
import { VerifyStep } from './verify.step.js';

/** Pipeline en el mismo orden que MIGRATION_STEPS de @crossvisor/contracts. */
export const PIPELINE: Step[] = [
  new PrecheckStep(),
  new PrepareSourceStep(),
  new CreateTargetStep(),
  new TransferDisksStep(),
  new AdaptGuestStep(),
  new StartTargetStep(),
  new VerifyStep(),
];

export type { Step };
