import React from 'react';
import { Box, Button, Card, Collapse, Flex, Stack, Text } from '@chakra-ui/react';

export default function VideoPanel({
  cardBorder,
  cardsBg,
  mutedText,
  headingColor,
  videoTab,
  setVideoTab,
  isMobileVideoOpen,
  setIsMobileVideoOpen,
  isVideoExpanded,
  embedUrl,
  videoTranscript,
  videoChapters,
  transcriptStatus,
  transcriptError,
  chaptersStatus,
  chaptersError,
  formatTimestamp,
}) {
  return (
    <Box
      flex="1"
      minW="0"
      position={{ base: 'static', lg: 'sticky' }}
      top={{ base: 'auto', lg: '120px' }}
      alignSelf={{ base: 'stretch', lg: 'flex-start' }}
    >
      <Card p="18px" borderRadius="18px" border="1px solid" borderColor={cardBorder} bg={cardsBg}>
        <Button
          size="xs"
          variant="outline"
          display={{ base: 'inline-flex', md: 'none' }}
          mb="12px"
          onClick={() => setIsMobileVideoOpen((prev) => !prev)}
        >
          {isMobileVideoOpen ? 'Hide video' : 'Show video'}
        </Button>
        <Collapse in={isVideoExpanded} animateOpacity>
          <Box
            borderRadius="16px"
            overflow="hidden"
            border="1px solid"
            borderColor={cardBorder}
          >
            {embedUrl ? (
              <Box as="iframe" title="YouTube video" src={embedUrl} w="100%" h="320px" />
            ) : (
              <Box p="16px">
                <Text color={mutedText}>Video preview not available.</Text>
              </Box>
            )}
          </Box>
        </Collapse>
        <Flex mt="16px" gap="8px" flexWrap="wrap" display={{ base: 'none', md: 'flex' }}>
          <Button
            size="xs"
            variant={videoTab === 'transcript' ? 'solid' : 'outline'}
            onClick={() => setVideoTab('transcript')}
          >
            Transcripts
          </Button>
          <Button
            size="xs"
            variant={videoTab === 'chapters' ? 'solid' : 'outline'}
            onClick={() => setVideoTab('chapters')}
          >
            Chapters
          </Button>
        </Flex>
        <Box mt="12px" maxH="170px" overflowY="auto" display={{ base: 'none', md: 'block' }}>
          {videoTab === 'transcript' ? (
            transcriptStatus === 'unavailable' ? (
              <Text color={mutedText}>{transcriptError || 'Transcript not available.'}</Text>
            ) : videoTranscript.length === 0 ? (
              <Text color={mutedText}>{transcriptError || 'Transcript not available.'}</Text>
            ) : (
              <Stack spacing="10px">
                {videoTranscript.map((entry, index) => (
                  <Flex key={`${entry.start}-${index}`} gap="10px">
                    <Text fontSize="xs" color={mutedText} minW="52px">
                      {formatTimestamp(entry.start)}
                    </Text>
                    <Text fontSize="sm" color={headingColor}>
                      {entry.text}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            )
          ) : chaptersStatus === 'pending' ? (
            <Text color={mutedText}>Generating chapters...</Text>
          ) : videoChapters.length === 0 ? (
            <Text color={mutedText}>{chaptersError || 'Chapters not available.'}</Text>
          ) : (
            <Stack spacing="10px">
              {videoChapters.map((chapter, index) => (
                <Flex key={`${chapter.start}-${index}`} gap="10px" align="center">
                  <Text fontSize="xs" color={mutedText} minW="52px">
                    {formatTimestamp(chapter.start)}
                  </Text>
                  <Text fontSize="sm" color={headingColor}>
                    {chapter.title}
                  </Text>
                </Flex>
              ))}
            </Stack>
          )}
        </Box>
      </Card>
    </Box>
  );
}
