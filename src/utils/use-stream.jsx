import React, { useEffect, useMemo } from 'react'
import { useGlobalState, useGlobalMutation } from './container'

export default function useStream (client) {
  const stateCtx = useGlobalState()
  const mutationCtx = useGlobalMutation()

  const [localStream, currentStream] = [
    stateCtx.localStream,
    stateCtx.currentStream
  ]

  const otherStreams = useMemo(
    () =>
      stateCtx.streams.filter(
        (stream) => stream.getId() !== currentStream.getId()
      ),
    [stateCtx, currentStream]
  )

  useEffect(() => {
    const addRemoteStream = (evt) => {
      const { stream } = evt
      client.subscribe(stream, (err) => {
        mutationCtx.toastError(
          `stream ${evt.stream.getId()} subscribe failed: ${err}`
        )
      })
    }
    if (client && client._subscribed === false) {
      client.on('connection-state-change', mutationCtx.connectionStateChanged)
      client.on('localStream-added', mutationCtx.addLocal)
      client.on('stream-published', mutationCtx.addStream)
      client.on('stream-added', addRemoteStream)
      client.on('stream-removed', mutationCtx.removeStream)
      client.on('peer-leave', mutationCtx.removeStreamById)
      client.on('stream-subscribed', (evt) => {
        client.setStreamFallbackOption(evt.stream, 2)
        mutationCtx.addStream(evt)
      })
      client._subscribed = true
    }
  }, [client, mutationCtx])

  useEffect(() => {
    if (client && client._subscribed === true && currentStream != null) {
      client.setRemoteVideoStreamType(currentStream, 0)
      otherStreams.forEach((otherStream) => {
        client.setRemoteVideoStreamType(otherStream, 1)
      })
    }
  }, [client, currentStream, otherStreams])

  return [localStream, currentStream, otherStreams]
}
