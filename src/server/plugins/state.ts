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

 - Paweł Marzec <pawel.marzec@modusbox.com>

 --------------
 ******/

import config from '~/shared/config'

import { ResponseToolkit, Server } from '@hapi/hapi'
import { KVS } from '~/shared/kvs'
import { PubSub } from '~/shared/pub-sub'
import Logger from '@mojaloop/central-services-logger'
import { RedisConnectionConfig } from '~/shared/redis-connection'

export interface StateResponseToolkit extends ResponseToolkit {
  getKVS: () => KVS
  getPubSub: () => PubSub
}

export const StatePlugin = {
  version: '1.0.0',
  name: 'StatePlugin',
  once: true,

  register: async (server: Server): Promise<void> => {
    // KVS & PubSub are using the same Redis instance
    const connection: RedisConnectionConfig = {
      host: config.REDIS.HOST,
      port: config.REDIS.PORT,
      timeout: config.REDIS.TIMEOUT,
      logger: Logger
    }

    // prepare redis connection instances
    const kvs = new KVS(connection)
    const pubSub = new PubSub(connection)

    try {
      // connect them all to Redis instance
      await Promise.all([kvs.connect(), pubSub.connect()])
      Logger.info('StatePlugin: connecting KVS & PubSub')

      // prepare toolkit accessors
      server.decorate('toolkit', 'getKVS', (): KVS => kvs)
      server.decorate('toolkit', 'getPubSub', (): PubSub => pubSub)

      // disconnect from redis when server is stopped
      server.events.on('stop', async () => {
        await Promise.allSettled([kvs.disconnect(), pubSub.disconnect()])
        Logger.info('StatePlugin: Server stopped -> disconnecting KVS & PubSub')
      })
    } catch (err) {
      Logger.error('StatePlugin: unexpected exception during plugin registration')
      Logger.error(err)
      Logger.error('StatePlugin: exiting process')
      process.exit(1)
    }
  }
}