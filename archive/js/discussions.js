// Variables spécifiques aux discussions
let currentReactionMessageId = null;

// Rendu de l'onglet Discussions
function renderDiscussionsTab(projectId) {
    const project = mockData.chantiers.find(p => p.id == projectId);
    if (!project) return;
    
    const tabContent = document.querySelectorAll('.project-tab-content')[2];
    if (!tabContent) return;
    
    const messages = project.messages || [];
    const parentMessages = messages.filter(msg => !msg.parentId);
    const replies = messages.filter(msg => msg.parentId);
    
    const repliesByParent = {};
    replies.forEach(reply => {
        if (!repliesByParent[reply.parentId]) {
            repliesByParent[reply.parentId] = [];
        }
        repliesByParent[reply.parentId].push(reply);
    });
    
    parentMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    Object.keys(repliesByParent).forEach(key => {
        repliesByParent[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
    
    const currentUser = mockData.user;
    
    let messagesHtml = '';
    
    parentMessages.forEach(parentMsg => {
        messagesHtml += renderMessage(parentMsg, project, currentUser, true);
        
        if (repliesByParent[parentMsg.id] && repliesByParent[parentMsg.id].length > 0) {
            messagesHtml += `<div class="ml-8 pl-4 border-l-2 border-gray-200 space-y-2 mt-2 mb-4">`;
            repliesByParent[parentMsg.id].forEach(replyMsg => {
                messagesHtml += renderMessage(replyMsg, project, currentUser, false, parentMsg.userName);
            });
            messagesHtml += `</div>`;
        }
    });
    
    const emojiPickerHtml = `
        <div id="emojiPicker" class="emoji-picker hidden">
            <div class="emoji-grid">
                ${emojis.map(emoji => `<span class="emoji-btn">${emoji}</span>`).join('')}
            </div>
        </div>
    `;
    
    const participantsHtml = `
        <div id="mentionsList" class="hidden absolute bottom-full left-0 mb-2 w-64 bg-white shadow-xl rounded-lg border border-gray-200 max-h-48 overflow-y-auto z-50">
            ${project.discussionsParticipants.map(p => `
                <div class="mention-item p-2 hover:bg-gray-100 cursor-pointer" data-user-id="${p.id}" data-user-name="${p.name}">
                    <div class="flex items-center">
                        <div class="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center mr-2">
                            <span class="text-white text-xs">${p.avatar}</span>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${p.name}</p>
                            <p class="text-xs text-gray-600">${p.role}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    tabContent.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="discussions-container p-4" style="max-height: 500px; overflow-y: auto;">
                ${messagesHtml || '<p class="text-gray-500 text-center py-8">Aucun message pour le moment. Soyez le premier à commenter !</p>'}
            </div>
            
            <div class="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg relative">
                ${emojiPickerHtml}
                ${participantsHtml}
                
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <span class="text-white font-medium text-xs">${currentUser.initiales}</span>
                    </div>
                    <div class="flex-1">
                        <div id="replyIndicator" class="hidden text-xs text-gray-500 mb-2 bg-gray-100 p-2 rounded-lg flex items-center justify-between">
                            <span>Répondre à <span id="replyToName" class="font-medium"></span></span>
                            <span id="replyToContext" class="text-xs text-gray-400 ml-2"></span>
                            <button id="cancelReplyBtn" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <textarea id="messageInput" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Écrivez votre message... Utilisez @ pour mentionner quelqu'un"></textarea>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center gap-2">
                                <button id="attachFileBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Joindre un fichier">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                    </svg>
                                </button>
                                <button id="emojiBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Ajouter un émoji">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </button>
                                <div id="typingIndicator" class="typing-indicator hidden">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                            <button id="sendMessageBtn" class="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center">
                                <span>Envoyer</span>
                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    initDiscussionsEventListeners(projectId);
}

function renderMessage(message, project, currentUser, isParent = true, parentAuthorName = '') {
    const isCurrentUser = message.userId === currentUser.id;
    const msgDate = new Date(message.timestamp);
    const formattedTime = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = msgDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    
    let content = message.content;
    
    if (!isParent && parentAuthorName) {
        content = content.replace(new RegExp(`^@${parentAuthorName}\\s*`), '');
    }
    
    if (message.mentions && message.mentions.length > 0) {
        message.mentions.forEach(mentionId => {
            const mentionedUser = project.discussionsParticipants.find(p => p.id === mentionId);
            if (mentionedUser) {
                const mentionRegex = new RegExp(`@${mentionedUser.name}`, 'g');
                content = content.replace(mentionRegex, `<span class="mention">@${mentionedUser.name}</span>`);
            }
        });
    }
    
    let reactionsHtml = '';
    if (message.reactions && message.reactions.length > 0) {
        reactionsHtml = '<div class="reaction-summary mt-2">';
        message.reactions.forEach(reaction => {
            const hasCurrentUser = reaction.users.includes(currentUser.id);
            reactionsHtml += `
                <span class="reaction-summary-item ${hasCurrentUser ? 'active' : ''}" data-message-id="${message.id}" data-emoji="${reaction.emoji}">
                    ${reaction.emoji} ${reaction.count}
                </span>
            `;
        });
        reactionsHtml += '</div>';
    }
    
    let attachmentsHtml = '';
    if (message.attachments && message.attachments.length > 0) {
        attachmentsHtml = '<div class="flex flex-wrap gap-2 mt-3">';
        message.attachments.forEach(att => {
            if (att.type === 'image') {
                attachmentsHtml += `
                    <div class="media-preview w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer">
                        <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <div class="media-preview-overlay">
                            <span class="text-xs">${att.name}</span>
                        </div>
                    </div>
                `;
            } else if (att.type === 'video') {
                attachmentsHtml += `
                    <div class="media-preview w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer">
                        <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="media-preview-overlay">
                            <span class="text-xs">${att.duration}</span>
                        </div>
                    </div>
                `;
            } else {
                attachmentsHtml += `
                    <div class="flex items-center p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                        <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        <span class="text-xs text-gray-700">${att.name}</span>
                    </div>
                `;
            }
        });
        attachmentsHtml += '</div>';
    }
    
    const replyIndicator = !isParent ? `
        <div class="flex items-center text-xs text-gray-400 mb-1">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
            </svg>
            En réponse à ${parentAuthorName}
        </div>
    ` : '';
    
    return `
        <div class="message-bubble p-4 ${isCurrentUser ? 'bg-blue-50' : 'bg-white'} rounded-lg border border-gray-100 ${isParent ? 'mb-4' : 'mb-2'}" data-message-id="${message.id}" data-message-author="${message.userName}" data-parent-id="${message.parentId || ''}">
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full ${isCurrentUser ? 'bg-blue-900' : 'bg-gray-500'} flex items-center justify-center mr-3 flex-shrink-0">
                    <span class="text-white font-medium text-xs">${message.userAvatar}</span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <div>
                            <span class="font-medium text-gray-900">${message.userName}</span>
                            <span class="text-xs text-gray-500 ml-2">${message.userRole}</span>
                        </div>
                        <span class="text-xs text-gray-500 tooltip" data-tooltip="${formattedDate} à ${formattedTime}">${formattedTime}</span>
                    </div>
                    ${replyIndicator}
                    <p class="text-gray-700">${content}</p>
                    ${attachmentsHtml}
                    ${reactionsHtml}
                    <div class="flex items-center gap-2 mt-2">
                        <button class="react-btn text-gray-400 hover:text-blue-900 text-sm flex items-center" data-message-id="${message.id}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Réagir
                        </button>
                        <button class="reply-btn text-gray-400 hover:text-blue-900 text-sm flex items-center" data-message-id="${message.id}" data-user-name="${message.userName}" data-parent-id="${message.parentId || ''}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                            </svg>
                            Répondre
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initDiscussionsEventListeners(projectId) {
    const messageInput = document.getElementById('messageInput');
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    const sendBtn = document.getElementById('sendMessageBtn');
    const mentionsList = document.getElementById('mentionsList');
    const replyIndicator = document.getElementById('replyIndicator');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');
    const replyToNameSpan = document.getElementById('replyToName');
    const replyToContextSpan = document.getElementById('replyToContext');
    
    if (!messageInput) return;
    
    if (appState.discussions.replyingTo && replyIndicator && replyToNameSpan) {
        const project = mockData.chantiers.find(p => p.id == projectId);
        if (project) {
            const originalMessage = project.messages.find(m => m.id === appState.discussions.replyingTo);
            if (originalMessage) {
                replyIndicator.classList.remove('hidden');
                replyToNameSpan.textContent = originalMessage.userName;
                replyToContextSpan.textContent = originalMessage.parentId ? '(réponse)' : '(message principal)';
            }
        }
    }
    
    let mentionSearch = '';
    let mentionTimeout;
    
    messageInput.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const text = this.value;
        const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
        
        if (lastAtPos !== -1 && lastAtPos < cursorPos) {
            const afterAt = text.substring(lastAtPos + 1, cursorPos);
            mentionSearch = afterAt;
            
            clearTimeout(mentionTimeout);
            mentionTimeout = setTimeout(() => {
                filterMentions(mentionSearch);
                mentionsList.classList.remove('hidden');
            }, 300);
        } else {
            mentionsList.classList.add('hidden');
        }
    });
    
    document.querySelectorAll('.mention-item').forEach(item => {
        item.removeEventListener('click', mentionClickHandler);
        item.addEventListener('click', mentionClickHandler);
    });
    
    function mentionClickHandler() {
        const userName = this.dataset.userName;
        const text = messageInput.value;
        const cursorPos = messageInput.selectionStart;
        const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
        
        if (lastAtPos !== -1) {
            messageInput.value = text.substring(0, lastAtPos) + `@${userName} ` + text.substring(cursorPos);
        }
        
        mentionsList.classList.add('hidden');
        messageInput.focus();
    }
    
    if (emojiBtn) {
        emojiBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            emojiPicker.classList.toggle('hidden');
        });
    }
    
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.removeEventListener('click', emojiClickHandler);
        btn.addEventListener('click', emojiClickHandler);
    });
    
    function emojiClickHandler() {
        const emoji = this.textContent;
        const cursorPos = messageInput.selectionStart;
        const text = messageInput.value;
        
        messageInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
        emojiPicker.classList.add('hidden');
        messageInput.focus();
    }
    
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', function() {
            appState.discussions.replyingTo = null;
            replyIndicator.classList.add('hidden');
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessageHandler);
    }
    
    function sendMessageHandler() {
        const content = messageInput.value.trim();
        if (!content) return;
        
        const project = mockData.chantiers.find(p => p.id == projectId);
        
        let parentId = null;
        let finalContent = content;
        
        if (appState.discussions.replyingTo) {
            const originalMessage = project.messages.find(m => m.id === appState.discussions.replyingTo);
            if (originalMessage) {
                if (originalMessage.parentId) {
                    parentId = originalMessage.parentId;
                    finalContent = `@${originalMessage.userName} ${content}`;
                } else {
                    parentId = originalMessage.id;
                    finalContent = `@${originalMessage.userName} ${content}`;
                }
            }
        }
        
        const newMessage = {
            id: `msg${Date.now()}`,
            userId: mockData.user.id,
            userName: mockData.user.name,
            userRole: mockData.user.role,
            userAvatar: mockData.user.initiales,
            content: finalContent,
            timestamp: new Date().toISOString(),
            reactions: [],
            attachments: [],
            mentions: [],
            parentId: parentId
        };
        
        if (project) {
            project.messages.push(newMessage);
            appState.discussions.replyingTo = null;
            renderDiscussionsTab(projectId);
            
            setTimeout(() => {
                simulateReply(projectId);
            }, 2000);
        }
        
        messageInput.value = '';
    }
    
    document.querySelectorAll('.react-btn').forEach(btn => {
        btn.removeEventListener('click', reactHandler);
        btn.addEventListener('click', reactHandler);
    });
    
    function reactHandler(e) {
        e.stopPropagation();
        const messageId = this.dataset.messageId;
        toggleReaction(messageId, projectId);
    }
    
    document.querySelectorAll('.reaction-summary-item').forEach(item => {
        item.removeEventListener('click', reactionSummaryHandler);
        item.addEventListener('click', reactionSummaryHandler);
    });
    
    function reactionSummaryHandler(e) {
        e.stopPropagation();
        const messageId = this.dataset.messageId;
        const emoji = this.dataset.emoji;
        toggleReaction(messageId, projectId, emoji);
    }
    
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.removeEventListener('click', replyHandler);
        btn.addEventListener('click', replyHandler);
    });
    
    function replyHandler(e) {
        e.stopPropagation();
        const messageId = this.dataset.messageId;
        const userName = this.dataset.userName;
        
        const project = mockData.chantiers.find(p => p.id == projectId);
        const message = project.messages.find(m => m.id === messageId);
        
        if (message) {
            if (message.parentId) {
                const parentMessage = project.messages.find(m => m.id === message.parentId);
                if (parentMessage) {
                    appState.discussions.replyingTo = parentMessage.id;
                    
                    if (replyIndicator && replyToNameSpan) {
                        replyIndicator.classList.remove('hidden');
                        replyToNameSpan.textContent = parentMessage.userName;
                        replyToContextSpan.textContent = '(message principal)';
                    }
                }
            } else {
                appState.discussions.replyingTo = messageId;
                
                if (replyIndicator && replyToNameSpan) {
                    replyIndicator.classList.remove('hidden');
                    replyToNameSpan.textContent = userName;
                    replyToContextSpan.textContent = '(message principal)';
                }
            }
            
            messageInput.focus();
        }
    }
    
    if (messageInput) {
        let typingTimeout;
        messageInput.addEventListener('keydown', function() {
            if (!appState.discussions.typingUsers.includes(mockData.user.id)) {
                appState.discussions.typingUsers.push(mockData.user.id);
                document.getElementById('typingIndicator').classList.remove('hidden');
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    appState.discussions.typingUsers = appState.discussions.typingUsers.filter(id => id !== mockData.user.id);
                    document.getElementById('typingIndicator').classList.add('hidden');
                }, 2000);
            }
        });
    }
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#emojiBtn') && !e.target.closest('#emojiPicker')) {
            if (emojiPicker) emojiPicker.classList.add('hidden');
        }
        if (!e.target.closest('.mention-item') && !e.target.closest('#messageInput')) {
            if (mentionsList) mentionsList.classList.add('hidden');
        }
    });
}

function filterMentions(search) {
    const project = mockData.chantiers.find(p => p.id == appState.currentProjectId);
    if (!project) return;
    
    const items = document.querySelectorAll('.mention-item');
    items.forEach(item => {
        const userName = item.dataset.userName.toLowerCase();
        if (userName.toLowerCase().includes(search.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function simulateReply(projectId) {
    const replies = [
        "Merci pour l'information !",
        "Je vais vérifier ça tout de suite.",
        "Parfait, je prends note.",
        "OK, on suit ça.",
        "Je confirme la réception."
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const project = mockData.chantiers.find(p => p.id == projectId);
    if (!project) return;
    
    const parentMessages = project.messages.filter(m => !m.parentId);
    if (parentMessages.length === 0) return;
    
    const randomParent = parentMessages[Math.floor(Math.random() * parentMessages.length)];
    
    const newMessage = {
        id: `msg${Date.now()}`,
        userId: "user2",
        userName: "Jean Dupont",
        userRole: "Conducteur de travaux",
        userAvatar: "JD",
        content: randomReply,
        timestamp: new Date().toISOString(),
        reactions: [],
        attachments: [],
        mentions: [],
        parentId: randomParent.id
    };
    
    if (project) {
        project.messages.push(newMessage);
        renderDiscussionsTab(projectId);
    }
}

function toggleReaction(messageId, projectId, emoji = null) {
    const project = mockData.chantiers.find(p => p.id == projectId);
    const message = project.messages.find(m => m.id === messageId);
    const currentUser = mockData.user;
    
    if (!message) return;
    
    if (!emoji) {
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker) {
            emojiPicker.classList.toggle('hidden');
            
            document.querySelectorAll('.emoji-btn').forEach(btn => {
                const handler = function() {
                    const selectedEmoji = this.textContent;
                    addReaction(messageId, projectId, selectedEmoji);
                    emojiPicker.classList.add('hidden');
                    btn.removeEventListener('click', handler);
                };
                btn.addEventListener('click', handler, { once: true });
            });
        }
    } else {
        addReaction(messageId, projectId, emoji);
    }
}

function addReaction(messageId, projectId, emoji) {
    const project = mockData.chantiers.find(p => p.id == projectId);
    const message = project.messages.find(m => m.id === messageId);
    const currentUser = mockData.user;
    
    if (!message) return;
    
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
        if (existingReaction.users.includes(currentUser.id)) {
            existingReaction.users = existingReaction.users.filter(id => id !== currentUser.id);
            existingReaction.count--;
            if (existingReaction.count === 0) {
                message.reactions = message.reactions.filter(r => r.emoji !== emoji);
            }
        } else {
            existingReaction.users.push(currentUser.id);
            existingReaction.count++;
        }
    } else {
        message.reactions.push({
            emoji: emoji,
            count: 1,
            users: [currentUser.id]
        });
    }
    
    renderDiscussionsTab(projectId);
}