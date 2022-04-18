  import {onMount, setContext} from 'svelte'
  import {state} from '../helpers'
  import {Contract} from 'etleneum'
  import {get} from 'svelte/store'
  import * as toast from '../../../common/toast'

  import account from '../../../components/etleneumAccountStore'

  import { LOTO_AUCTION_CONTRACT } from '../constants/contracts'

  export default function initAuctionContract(unsetCallListeners){

  const EventSource = window.EventSource
  const ETLENEUM = window.etleneum || 'https://etleneum.com'
  var es

  const currentState = get(state)
  const accountState = get(account)
  const loto_contract = Contract(LOTO_AUCTION_CONTRACT)
  setContext('loto_contract', loto_contract)


  // Listen loto contract stream.
  onMount(() => {
    return loto_contract.stream(
      async id => {
        let newCall = await loto_contract.loadCall(id)
        if (currentState.call.id === id) {
          for (let i = 0; i < unsetCallListeners.length; i++) {
            unsetCallListeners[i]()
          }

          switch (newCall.method) {
            case 'create_auction':
              // we've created a auction
              toast.success(`Your auction was created!`)
              break
            case 'deposit':
              // we've created a auction
              toast.success(`Your account balance was deposited!`)
              accountState.refresh()
              balanceUpdate()
              break
            case 'buy_ticket':
              // we've placed a bid
              toast.success(`Ticket bought!`)
              accountState.refresh()
              balanceUpdate()
              break
            case 'finish_auction':
              toast.success('Auction finished!')
              accountState.refresh()
              balanceUpdate()
          }
        } else {
          switch (newCall.method) {
            case 'create_auction':
              // someone else has created a auction
              toast.success(`A auction was created!`)
              break
            case 'buy_ticket':
              // someone else has placed a bid
              toast.success(`Someone bought ticket!`)
              // when someone outbid our bid - this may cause balance
              accountState.refresh()
              balanceUpdate()
              break
            case 'deposit':
              // someone else has placed a bid
              toast.success(`Someone made deposit!`)
              break
            case 'finish_auction':
              // someone else finished auction
              toast.success('Someone finished auction!')
          }
        }
      },
      (id, errMessage) => {
        if (currentState.call === id) {
          toast.warning(`Your call failed: ${errMessage}`)
        } else {
          toast.warning(`A call from someone else failed: ${errMessage}`)
        }
      }
    )

    function balanceUpdate(){
      es = new EventSource(
        `${ETLENEUM}/~~~/session?src=etleneum-client&session=${accountState.session}`
      )  
      es.addEventListener('auth', e => {
        let data = JSON.parse(e.data)
        account.id = data.account
        account.balance = data.balance

        if (es) {
          es.close()
        }
      })
    }
  })
}