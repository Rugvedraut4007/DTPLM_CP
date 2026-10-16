package com.studymarket.friendship;
import com.studymarket.user.User; import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="friend_requests") public class FriendRequest{
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="sender_id",nullable=false) private User sender;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="receiver_id",nullable=false) private User receiver;
 @Column(nullable=false) private String status; @Column(nullable=false,updatable=false) private Instant createdAt; private Instant respondedAt;
 protected FriendRequest(){} public FriendRequest(User s,User r){sender=s;receiver=r;status="PENDING";}
 @PrePersist void init(){if(createdAt==null)createdAt=Instant.now();} public void respond(String value,Instant at){status=value;respondedAt=at;}
 public Long getId(){return id;} public User getSender(){return sender;} public User getReceiver(){return receiver;} public String getStatus(){return status;} public Instant getCreatedAt(){return createdAt;} public Instant getRespondedAt(){return respondedAt;}
}