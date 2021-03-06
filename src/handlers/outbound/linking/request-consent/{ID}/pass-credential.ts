/*****
 License
 --------------
 Copyright © 2020 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License")
 and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed
 on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 - Kevin Leyow <kevin.leyow@modusbox.com>
 --------------
 ******/

import { StateResponseToolkit } from '~/server/plugins/state'
import { Request, ResponseObject } from '@hapi/hapi'
import { PISPLinkingModel, loadFromKVS } from '~/models/outbound/pispLinking.model';
import {
  PISPLinkingModelConfig,
} from '~/models/outbound/pispLinking.interface'
import config from '~/shared/config';
import inspect from '~/shared/inspect';
import * as OutboundAPI from '~/interface/outbound/api_interfaces'


/**
 * Handles outbound POST /linking/request-consent/{ID}/pass-credential request
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// todo: consider changing this to PUT /linking/request-consent/{ID}/pass-credential
//       since the flow triggers a PUT /consents/{ID}
async function post (_context: any, request: Request, h: StateResponseToolkit): Promise<ResponseObject> {
  const payload = request.payload as OutboundAPI.Schemas.LinkingRequestConsentIDPassCredentialRequest
  const consentRequestId = request.params.ID

  const modelConfig: PISPLinkingModelConfig = {
    kvs: h.getKVS(),
    pubSub: h.getPubSub(),
    key: consentRequestId,
    logger: h.getLogger(),
    thirdpartyRequests: h.getThirdpartyRequests(),
    requestProcessingTimeoutSeconds: config.REQUEST_PROCESSING_TIMEOUT_SECONDS
  }

  try {
    const model: PISPLinkingModel = await loadFromKVS(modelConfig)
    model.data.linkingRequestConsentIDPassCredentialPostRequest = payload

    const result = await model.run()
    if (!result) {
      h.getLogger().error('outbound POST /linking/request-consent/{ID}/pass-credential unexpected result from workflow')
      return h.response({}).code(500)
    }

    const statusCode = (result.currentState == 'errored') ? 500 : 200
    return h.response(result).code(statusCode)
  } catch(error) {
    // todo: PUT /consents/{ID}/error to DFSP if PISP is unable to handle
    //       the previous inbound POST /consents request
    //       Do we need to notify the DFSP here...? Shouldn't it just be
    //       the PISP?
    h.getLogger().info(`Error running PISPLinkingModel : ${inspect(error)}`)
    return h.response({}).code(500)
  }
}

export default {
  post
}
