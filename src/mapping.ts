import { Address, BigInt, store, log } from "@graphprotocol/graph-ts"

import {
  HumanityGovernance,
  Propose as ProposeEvent,
  Vote as VoteEvent,
  RemoveVote as RemoveVoteEvent,
  Terminate as TerminateEvent,
  Execute as ExecuteEvent,
} from '../generated/HumanityGovernance/HumanityGovernance'

import {
  Apply as ApplyEvent,
} from '../generated/TwitterHumanityApplicant/TwitterHumanityApplicant'

import { Proposal, Vote, Account } from "../generated/schema"

const proposalResultPending = 'PENDING'
const proposalResultRejected = 'REJECTED'
const proposalResultApproved = 'APPROVED'
const yesValue = 'YES'
const noValue = 'NO'

export function handlePropose(event: ProposeEvent): void {
  let accountId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let account = new Account(accountId)
  account.address = ''
  // account.countVotes = BigInt.fromI32(0)
  // account.countProposals = BigInt.fromI32(1)
  account.save()

  let humanityGovernance = HumanityGovernance.bind(event.address)

  let proposalId = event.params.proposalId.toHex()
  let proposal = new Proposal(proposalId)
  proposal.proposalData = ''
  proposal.proposer = accountId
  proposal.result = proposalResultPending
  proposal.countYesVotes = humanityGovernance.proposalFee()
  proposal.countNoVotes = BigInt.fromI32(0)
  // account.countProposals = account.countProposals.plus(BigInt.fromI32(1))
  proposal.save()

  let voteId = proposalId + '-' + accountId
  let vote = new Vote(voteId)
  vote.voter = accountId
  vote.proposal = proposalId
  vote.value = yesValue
  vote.save()
}

export function handleApply(event: ApplyEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let applicant = event.params.applicant.toHex()
  let username = event.params.username

  let proposal = Proposal.load(proposalId)
  let account = Account.load(proposal.proposer)

  if (proposal === null) {
    log.critical('handleApply: cannot find proposal with id: {}', [proposalId])
  }

  if (account === null) {
    log.critical('handleApply: cannot find account with id: {}', [proposal.proposer])
  }

  proposal.proposalData = username
  proposal.save()
  account.address = applicant
  account.save()
}

export function handleVote(event: VoteEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let voterAddress = event.params.voter.toHex()
  let approve = event.params.approve
  let weight = event.params.weight

  let voter = new Account(voterAddress)
  voter.address = voterAddress
  // voter.countVotes = voter.countVotes.plus(BigInt.fromI32(1))
  voter.save()

  let voteId = proposalId + '-' + voterAddress

  let vote = new Vote(voteId)
  vote.proposal = proposalId
  vote.voter = voterAddress

  let proposal = Proposal.load(proposalId)

  if (approve) {
    proposal.countYesVotes = proposal.countYesVotes.plus(weight)
    vote.value = yesValue
  } else {
    proposal.countNoVotes = proposal.countNoVotes.plus(weight)
    vote.value = noValue
  }

  vote.save()
  proposal.save()
}

export function handleRemoveVote(event: RemoveVoteEvent): void {
  let proposalId = event.params.proposalId.toHex()
  let voterAddress = event.params.voter.toHex()

  let proposal = Proposal.load(proposalId)
  let proposer = Account.load(proposal.proposer)

  let voteId = proposer.address === voterAddress ? proposer.id : proposalId + '-' + voterAddress

  let vote = Vote.load(voteId)

  let voter = Account.load(vote.voter)

  if (voter === null) {
    log.critical('removeVote: cannot find voter with id {}', [vote.voter])
  }

  // voter.countVotes = voter.countVotes.minus(BigInt.fromI32(1))

  // voter.save()

  if (vote === null) {
    log.critical('removeVote: cannot find vote with id {}', [voteId])
  }

  store.remove('Vote', voteId)
}

export function handleTerminate(event: TerminateEvent): void {
  let proposalId = event.params.proposalId.toHex()

  let proposal = Proposal.load(proposalId)

  proposal.result = proposalResultRejected

  proposal.save()
}

export function handleExecute(event: ExecuteEvent): void {
  let proposalId = event.params.proposalId.toHex()

  let proposal = Proposal.load(proposalId)

  proposal.result = proposalResultApproved

  proposal.save()
}