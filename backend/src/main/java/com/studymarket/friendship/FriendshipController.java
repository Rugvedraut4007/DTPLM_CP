package com.studymarket.friendship;
import com.studymarket.user.User; import java.util.List; import org.springframework.web.bind.annotation.*;
@RestController public class FriendshipController{
 private final FriendshipService service; public FriendshipController(FriendshipService s){service=s;}
 @PostMapping("/api/friends/requests") public FriendRequest send(@RequestBody Request r){return service.send(r.senderUserId(),r.receiverUserId());}
 @GetMapping("/api/users/{userId}/friends") public List<UserSummary> friends(@PathVariable Long userId){return service.friends(userId).stream().map(UserSummary::from).toList();}
 @GetMapping("/api/users/{userId}/friend-requests") public List<FriendRequest> pending(@PathVariable Long userId){return service.pending(userId);}
 @PostMapping("/api/friends/requests/{requestId}/accept") public FriendRequest accept(@PathVariable Long requestId,@RequestParam Long userId){return service.respond(requestId,userId,"ACCEPTED");}
 @PostMapping("/api/friends/requests/{requestId}/reject") public FriendRequest reject(@PathVariable Long requestId,@RequestParam Long userId){return service.respond(requestId,userId,"REJECTED");}
 public record Request(Long senderUserId,Long receiverUserId){} public record UserSummary(Long id,String username){static UserSummary from(User u){return new UserSummary(u.getId(),u.getUsername());}}
}