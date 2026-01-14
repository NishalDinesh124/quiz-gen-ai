import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Card, Flex, IconButton, Stack, Text } from '@chakra-ui/react';
import { MdDownload, MdOpenInFull } from 'react-icons/md';

export default function NotesTab({
  videoContext,
  notes,
  pendingAssets,
  mutedText,
  headingColor,
  cardBorder,
  cardsBg,
  notePreview,
  setActiveNote,
  handleDownloadNote,
}) {
  return (
    <Box
      mt="18px"
      maxH={{ base: 'calc(100vh - 260px)', md: 'calc(100vh - 220px)' }}
      overflowY="auto"
      overflowX="hidden"
      pr={videoContext ? '6px' : '0'}
    >
      {notes.length === 0 ? (
        <Card
          p="18px"
          borderRadius="18px"
          border="1px solid"
          borderColor={cardBorder}
          bg={cardsBg}
        >
          <Text color={mutedText}>
            {pendingAssets.notes
              ? 'Generating notes...'
              : 'Ask the AI tutor to create notes to see them here.'}
          </Text>
        </Card>
      ) : (
        <Stack spacing="16px">
          {notes.map((note) => (
            <Card
              key={note._id}
              p="18px"
              borderRadius="18px"
              border="1px solid"
              borderColor={cardBorder}
              bg={cardsBg}
            >
              <Text fontSize="sm" fontWeight="600" color={headingColor}>
                {note.title || 'Study Notes'}
              </Text>
              <Box color={mutedText} fontSize="sm" mt="8px">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <Text fontSize="sm" mb="8px" noOfLines={3}>
                        {children}
                      </Text>
                    ),
                    strong: ({ children }) => (
                      <Text as="strong" fontWeight="600">
                        {children}
                      </Text>
                    ),
                    ul: ({ children }) => (
                      <Box as="ul" pl="18px" mb="8px">
                        {children}
                      </Box>
                    ),
                    ol: ({ children }) => (
                      <Box as="ol" pl="18px" mb="8px">
                        {children}
                      </Box>
                    ),
                    li: ({ children }) => (
                      <Box as="li" mb="4px">
                        {children}
                      </Box>
                    ),
                  }}
                >
                  {notePreview(note)}
                </ReactMarkdown>
              </Box>
              <Flex mt="12px" justify="flex-end" gap="6px">
                <IconButton
                  aria-label="Expand notes"
                  icon={<MdOpenInFull />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveNote(note)}
                />
                <IconButton
                  aria-label="Download notes"
                  icon={<MdDownload />}
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadNote(note)}
                />
              </Flex>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
