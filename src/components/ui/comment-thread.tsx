"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Comment } from "@/lib/types/deal";
import { nanoid } from "nanoid";
import { MessageSquare, Reply, Trash2 } from "lucide-react";

interface CommentThreadProps {
  comments: Comment[];
  onChange: (comments: Comment[]) => void;
  userName?: string;
  userId?: string;
}

export function CommentThread({ 
  comments, 
  onChange, 
  userName = "User",
  userId = "user-1"
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const addComment = (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    const comment: Comment = {
      id: nanoid(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      parentId,
    };

    onChange([...comments, comment]);
    
    if (parentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setNewComment("");
    }
  };

  const deleteComment = (commentId: string) => {
    // Also delete all replies to this comment
    onChange(comments.filter(c => c.id !== commentId && c.parentId !== commentId));
  };

  // Get top-level comments (no parent)
  const topLevelComments = comments.filter(c => !c.parentId);
  
  // Get replies for a specific comment
  const getReplies = (commentId: string) => {
    return comments.filter(c => c.parentId === commentId);
  };

  // Sort comments by timestamp, newest first for top-level, oldest first for replies
  const sortedTopLevel = [...topLevelComments].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const renderComment = (comment: Comment, isReply = false) => {
    const replies = getReplies(comment.id);
    
    return (
      <div key={comment.id} className={isReply ? "ml-8 mt-2" : "mt-3"}>
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{comment.userName || comment.userId}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteComment(comment.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {!isReply && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              {replies.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Badge>
              )}
            </div>
          )}

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="space-y-2 pt-2 border-t">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addComment(comment.id)}>
                  Post Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {replies.length > 0 && (
          <div className="space-y-2">
            {replies
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Comment */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                addComment();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to quickly add a comment
            </p>
            <Button onClick={() => addComment()} disabled={!newComment.trim()}>
              Post Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {sortedTopLevel.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-auto">
            {sortedTopLevel.map(comment => renderComment(comment))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Start the conversation!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

