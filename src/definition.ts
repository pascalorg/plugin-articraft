import { articraftAssetEditContribution } from './definition.edit'
import { articraftAssetRenderDefinition } from './definition.render'

export const articraftAssetDefinition = {
  ...articraftAssetRenderDefinition,
  ...articraftAssetEditContribution,
}
