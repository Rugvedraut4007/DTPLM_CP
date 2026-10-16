package com.studymarket.friendship;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.any; import static org.mockito.Mockito.*;
import com.studymarket.user.*; import java.time.*; import java.util.*; import org.junit.jupiter.api.*;
class FriendshipServiceTest{
 FriendRequestRepository rr=mock(FriendRequestRepository.class);UserRepository ur=mock(UserRepository.class);User a=mock(User.class),b=mock(User.class);FriendshipService service;
 @BeforeEach void set(){when(a.getId()).thenReturn(1L);when(b.getId()).thenReturn(2L);when(a.getUsername()).thenReturn("a");when(b.getUsername()).thenReturn("b");service=new FriendshipService(rr,ur,Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"),ZoneOffset.UTC));when(ur.findById(1L)).thenReturn(Optional.of(a));when(ur.findById(2L)).thenReturn(Optional.of(b));when(rr.save(any())).thenAnswer(i->i.getArgument(0));when(rr.existsBySenderAndReceiverAndStatus(any(),any(),eq("PENDING"))).thenReturn(false);}
 @Test void sendAcceptAndFriends(){FriendRequest r=service.send(1L,2L);when(rr.findById(1L)).thenReturn(Optional.of(r));service.respond(1L,2L,"ACCEPTED");when(rr.findAllBySenderOrReceiverAndStatus(a,a,"ACCEPTED")).thenReturn(List.of(r));assertThat(service.friends(1L)).containsExactly(b);}
 @Test void selfAndDuplicateRequestsRejected(){assertThatThrownBy(()->service.send(1L,1L)).isInstanceOf(IllegalArgumentException.class);when(rr.existsBySenderAndReceiverAndStatus(a,b,"PENDING")).thenReturn(true);assertThatThrownBy(()->service.send(1L,2L)).isInstanceOf(IllegalStateException.class);}
}