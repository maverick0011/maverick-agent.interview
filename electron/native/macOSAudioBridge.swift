//
//  macOSAudioBridge.swift
//  Maverick AI Native CoreAudio & ScreenCaptureKit Integration
//
//  Provides dual-channel isolated audio capture:
//  Channel 0: System Audio (Interviewer / Video Conference output via ScreenCaptureKit)
//  Channel 1: Input Audio (User Microphone via CoreAudio HAL / AVFoundation)
//

import Foundation
import AVFoundation
import ScreenCaptureKit

@available(macOS 13.0, *)
public class MaverickSystemAudioCapture: NSObject, SCStreamOutput, SCStreamDelegate {
    private var stream: SCStream?
    private var isCapturing = false
    public var onAudioBufferReceived: ((CMSampleBuffer, AudioChannelType) -> Void)?

    public enum AudioChannelType {
        case systemAudio
        case microphone
    }

    public func startSystemAudioCapture() async throws {
        // Query shareable content for audio capture
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        guard let display = content.displays.first else {
            throw NSError(domain: "MaverickAudio", code: 404, userInfo: [NSLocalizedDescriptionKey: "No active display found for ScreenCaptureKit"])
        }

        let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
        let config = SCStreamConfiguration()
        
        // Optimize for pure audio capture (disable heavy video frames)
        config.capturesAudio = true
        config.sampleRate = 16000 // 16kHz PCM for Whisper speech-to-text
        config.channelCount = 1   // Mono downmix
        config.width = 2
        config.height = 2
        config.minimumFrameInterval = CMTime(value: 1, timescale: 1) // 1 fps idle video to minimize CPU

        stream = SCStream(filter: filter, configuration: config, delegate: self)
        try stream?.addStreamOutput(self, type: .audio, sampleHandlerQueue: DispatchQueue(label: "ai.maverick.systemaudio"))
        try await stream?.startCapture()
        isCapturing = true
    }

    public func stopCapture() async throws {
        if isCapturing {
            try await stream?.stopCapture()
            stream = nil
            isCapturing = false
        }
    }

    // SCStreamOutput Delegate callback
    public func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio else { return }
        onAudioBufferReceived?(sampleBuffer, .systemAudio)
    }

    public func stream(_ stream: SCStream, didStopWithError error: Error) {
        isCapturing = false
    }
}
