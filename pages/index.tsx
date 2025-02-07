import * as React from 'react';

import { Box, Container, IconButton, List, Option, Select, Sheet, Stack, Typography, useColorScheme, useTheme } from '@mui/joy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import Face6Icon from '@mui/icons-material/Face6';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';

import { ChatMessage, UiMessage } from '../components/ChatMessage';
import { Composer } from '../components/Composer';
import { isValidOpenAIApiKey, loadOpenAIApiKey, Settings } from '../components/Settings';


/// Purpose configuration

type SystemPurpose = 'Generic' | 'Developer' | 'Executive' | 'Scientist';

const PurposeData: { [key in SystemPurpose]: { systemMessage: string; description: string | JSX.Element } } = {
  Developer: {
    systemMessage: 'You are a sophisticated, accurate, and modern AI programming assistant',
    description: <>Helps you code</>,
  },
  Executive: {
    systemMessage: 'You are an executive assistant. Your communication style is concise, brief, formal',
    description: 'Helps you write business emails',
  },
  Generic: {
    systemMessage: 'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-4 architecture.\nKnowledge cutoff: 2021-09\nCurrent date: {{Today}}',
    description: 'Helps you think',
  },
  Scientist: {
    systemMessage: 'You are a scientist\'s assistant. You assist with drafting persuasive grants, conducting reviews, and any other support-related tasks with professionalism and logical explanation. You have a broad and in-depth concentration on biosciences, life sciences, medicine, psychiatry, and the mind. Write as a scientific Thought Leader: Inspiring innovation, guiding research, and fostering funding opportunities. Focus on evidence-based information, emphasize data analysis, and promote curiosity and open-mindedness',
    description: 'Helps you write scientific papers',
  },
};


/// UI Messages configuration

const MessageDefaults: { [key in UiMessage['role']]: Pick<UiMessage, 'role' | 'sender' | 'avatar'> } = {
  system: {
    role: 'system',
    sender: 'Bot',
    avatar: SmartToyTwoToneIcon, //'https://em-content.zobj.net/thumbs/120/apple/325/robot_1f916.png',
  },
  user: {
    role: 'user',
    sender: 'You',
    avatar: Face6Icon, //https://mui.com/static/images/avatar/2.jpg',
  },
  assistant: {
    role: 'assistant',
    sender: 'Bot',
    avatar: SmartToyOutlinedIcon, // 'https://www.svgrepo.com/show/306500/openai.svg',
  },
};

const createUiMessage = (role: UiMessage['role'], text: string): UiMessage => ({
  uid: Math.random().toString(36).substring(2, 15),
  text: text,
  ...MessageDefaults[role],
});


/// Chat ///

export default function Conversation() {
  const theme = useTheme();
  const { mode: colorMode, setMode: setColorMode } = useColorScheme();

  const [selectedSystemPurpose, setSelectedSystemPurpose] = React.useState<SystemPurpose>('Developer');
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [disableCompose, setDisableCompose] = React.useState(false);
  const [settingsShown, setSettingsShown] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    // show the settings at startup if the API key is not present
    if (!isValidOpenAIApiKey(loadOpenAIApiKey()))
      setSettingsShown(true);
  }, []);

  const handleDarkModeToggle = () => setColorMode(colorMode === 'dark' ? 'light' : 'dark');


  const handleListClear = () => setMessages([]);

  const handleListDelete = (uid: string) =>
    setMessages(list => list.filter(message => message.uid !== uid));

  const handleListEdit = (uid: string, newText: string) =>
    setMessages(list => list.map(message => (message.uid === uid ? { ...message, text: newText } : message)));


  const handlePurposeChange = (role: string | null) => {
    if (role)
      setSelectedSystemPurpose(role as SystemPurpose);
  };


  const getBotMessageStreaming = async (messages: UiMessage[]) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: loadOpenAIApiKey(), messages: messages }),
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      const newBotMessage: UiMessage = createUiMessage('assistant', '');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const messageText = decoder.decode(value);
        newBotMessage.text += messageText;

        setMessages(list => {
          // if missing, add the message at the end of the list, otherwise set a new list anyway, to trigger a re-render
          const message = list.find(message => message.uid === newBotMessage.uid);
          return !message ? [...list, newBotMessage] : [...list];
        });
      }
    }
  };

  const handleComposerSendMessage: (text: string) => void = (text) => {

    // seed the conversation with a 'system' message
    const conversation = [...messages];
    if (!conversation.length)
      conversation.push(createUiMessage('system', PurposeData[selectedSystemPurpose].systemMessage));

    // add the user message
    conversation.push(createUiMessage('user', text));

    // update the list of messages
    setMessages(conversation);
    messagesEndRef.current?.scrollIntoView();

    // disable the composer while the bot is replying
    setDisableCompose(true);
    getBotMessageStreaming(conversation)
      .then(() => setDisableCompose(false));
  };


  const listEmpty = !messages.length;

  return (
    <Container maxWidth='xl' disableGutters sx={{
      boxShadow: theme.vars.shadow.lg,
    }}>
      <Stack direction='column' sx={{
        minHeight: '100vh',
      }}>

        {/* Application Bar */}
        <Sheet variant='solid' invertedColors sx={{
          position: 'sticky', top: 0, zIndex: 20, p: 1,
          background: theme.vars.palette.primary.solidHoverBg,
          display: 'flex', flexDirection: 'row',
        }}>
          <IconButton variant='plain' color='neutral' onClick={handleDarkModeToggle}>
            <DarkModeIcon />
          </IconButton>

          {/*{!isEmpty && (*/}
          {/*  <IconButton variant='plain' color='neutral' disabled={isDisabledCompose} onClick={onClearConversation}>*/}
          {/*    <DeleteOutlineOutlinedIcon />*/}
          {/*  </IconButton>*/}
          {/*)}*/}

          <Typography sx={{
            textAlign: 'center',
            fontFamily: theme.vars.fontFamily.code, fontSize: '1rem', lineHeight: 1.75,
            my: 'auto',
            flexGrow: 1,
          }} onDoubleClick={handleListClear}>
            GPT-4
          </Typography>

          <IconButton variant='plain' color='neutral' onClick={() => setSettingsShown(true)}>
            <SettingsOutlinedIcon />
          </IconButton>
        </Sheet>

        {/* Chat */}
        <Box sx={{
          flexGrow: 1,
          background: theme.vars.palette.background.level1,
        }}>
          {listEmpty ? (
            <Stack direction='column' sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
              <Box>
                <Typography level='body3' color='neutral'>
                  AI purpose
                </Typography>
                <Select value={selectedSystemPurpose} onChange={(e, v) => handlePurposeChange(v)} sx={{ minWidth: '40vw' }}>
                  <Option value='Developer'>Developer</Option>
                  <Option value='Scientist'>Scientist</Option>
                  <Option value='Executive'>Executive</Option>
                  <Option value='Generic'>ChatGPT4</Option>
                </Select>
                <Typography level='body2' sx={{ mt: 2, minWidth: 260 }}>
                  {PurposeData[selectedSystemPurpose].description}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <>
              <List sx={{ p: 0 }}>
                {messages.map((message, index) =>
                  <ChatMessage key={index} uiMessage={message}
                               onDelete={() => handleListDelete(message.uid)}
                               onEdit={newText => handleListEdit(message.uid, newText)} />)}
                <div ref={messagesEndRef}></div>
              </List>
            </>
          )}
        </Box>

        {/* Compose */}
        <Box sx={{
          position: 'sticky', bottom: 0, zIndex: 10,
          background: theme.vars.palette.background.body,
          borderTop: '1px solid',
          borderTopColor: theme.vars.palette.divider,
          p: { xs: 1, md: 2 },
        }}>
          <Composer isDeveloper={selectedSystemPurpose === 'Developer'} disableSend={disableCompose} sendMessage={handleComposerSendMessage} />
        </Box>

      </Stack>

      {/* Settings Modal */}
      <Settings open={settingsShown} onClose={() => setSettingsShown(false)} />

    </Container>
  );
}