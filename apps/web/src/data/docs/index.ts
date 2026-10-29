import type { DocItem, DocMeta } from '../types';
import { introductionDoc } from './introduction';
import { installationDoc } from './installation';
import { quickstartDoc } from './quickstart';
import { constructApiDoc } from './construct-api';
import { constructAuthDoc } from './construct-auth';
import { constructTableDoc } from './construct-table';
import { constructBucketDoc } from './construct-bucket';
import { constructQueueDoc } from './construct-queue';
import { constructTopicSecretDoc } from './construct-topic-secret';
import { safetyRailsDoc } from './safety-rails';
import { leastPrivilegeIamDoc } from './least-privilege-iam';
import { brownfieldAdoptionDoc } from './brownfield-adoption';
import { testingDoc } from './testing';
import { cliReferenceDoc } from './cli-reference';
import { ehrBackendCaseStudyDoc } from './ehr-backend-case-study';
import { securityDoc } from './security';

export const DOCS_DATA: DocItem[] = [
  introductionDoc,
  installationDoc,
  quickstartDoc,
  constructApiDoc,
  constructAuthDoc,
  constructTableDoc,
  constructBucketDoc,
  constructQueueDoc,
  constructTopicSecretDoc,
  safetyRailsDoc,
  securityDoc,
  leastPrivilegeIamDoc,
  brownfieldAdoptionDoc,
  testingDoc,
  cliReferenceDoc,
  ehrBackendCaseStudyDoc,
];

export const DOCS_META: DocMeta[] = DOCS_DATA.map(({ slug, title, category, description }) => ({
  slug,
  title,
  category,
  description,
}));
