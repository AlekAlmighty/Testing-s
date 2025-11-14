// Simple client-side stories feed using localStorage
(function(){
  const postsKey = 'bg_stories_posts_v1';
  const postsContainer = document.getElementById('posts-container');
  const postForm = document.getElementById('post-form');
  const imageInput = document.getElementById('image-input');
  const descInput = document.getElementById('desc-input');

  // Example images from repo
  const sampleImages = [
    'dashboard/breathing.jpg',
    'dashboard/motivation.jpg',
    'dashboard/streak.jpg'
  ];

  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

  function loadPosts(){
    const raw = localStorage.getItem(postsKey);
    if(!raw){
      const initial = [
        {
          id: uid(),
          author: 'Sofia',
          desc: 'Today marked 10 days smoke-free. I swapped my afternoon cigarette with a short walk and it helped so much. You can do it!',
          image: sampleImages[0],
          likes:0,dislikes:0,comments:[]
        },
        {
          id: uid(),
          author: 'Miguel',
          desc: 'I used a jar to track money saved and it really motivates me. First week was hard but the cravings passed quicker each day.',
          image: sampleImages[1],
          likes:3,dislikes:0,comments:[{author:'Ana',text:'Inspiring!'}]
        },
        {
          id: uid(),
          author: 'Rhea',
          desc: 'Lost my streak once but got back up. That reset didn\'t mean failure, it meant I learned what triggers me.',
          image: sampleImages[2],
          likes:2,dislikes:1,comments:[]
        }
      ];
      localStorage.setItem(postsKey,JSON.stringify(initial));
      return initial;
    }
    try{return JSON.parse(raw)||[];}catch(e){return []}
  }

  function savePosts(posts){localStorage.setItem(postsKey,JSON.stringify(posts));}

  function render(){
    const posts = loadPosts();
    postsContainer.innerHTML = '';
    posts.slice().reverse().forEach(post=>{
      const el = document.createElement('div');
      el.className = 'post';
      el.setAttribute('data-post-id', post.id);
      el.innerHTML = `
        <div class="meta"><div class="author">${escapeHtml(post.author)}</div><div class="small-muted">• ${new Date(parseInt(post.id,36)).toLocaleString()}</div></div>
        ${post.image?`<div class="image-wrapper"><img src="${escapeHtml(post.image)}" alt="post image"></div>`:''}
        <div class="desc">${escapeHtml(post.desc)}</div>
        <div class="actions">
          <button class="action-btn like-btn">👍 <span class="like-count">${post.likes}</span></button>
          <button class="action-btn dislike-btn">👎 <span class="dislike-count">${post.dislikes}</span></button>
          <button class="action-btn edit-btn">✏️ Edit</button>
          <button class="action-btn delete-btn">🗑️ Delete</button>
        </div>
        <div class="comments">
          ${post.comments.map(c=>`<div class="comment"><strong>${escapeHtml(c.author)}</strong>: ${escapeHtml(c.text)}</div>`).join('')}
          <form class="comment-form" data-post-id="${post.id}">
            <input placeholder="Write a comment" aria-label="comment">
            <button type="submit">Comment</button>
          </form>
        </div>
      `;

      // hook actions
      const likeBtn = el.querySelector('.like-btn');
      const dislikeBtn = el.querySelector('.dislike-btn');
      const editBtn = el.querySelector('.edit-btn');
      const deleteBtn = el.querySelector('.delete-btn');

      likeBtn.addEventListener('click',()=>{
        toggleReaction(post.id,'like');
      });
      dislikeBtn.addEventListener('click',()=>{
        toggleReaction(post.id,'dislike');
      });

      editBtn.addEventListener('click',()=>{
        startEdit(post.id);
      });

      deleteBtn.addEventListener('click',()=>{
        if(confirm('Delete this post? This cannot be undone.')){
          deletePost(post.id);
        }
      });

      const commentForm = el.querySelector('.comment-form');
      commentForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const input = commentForm.querySelector('input');
        if(!input.value.trim())return;
        addComment(post.id, {author:'You', text: input.value.trim()});
        input.value='';
      });

      postsContainer.appendChild(el);
    });
  }

  function toggleReaction(postId, type){
    const posts = loadPosts();
    const idx = posts.findIndex(p=>p.id===postId);
    if(idx===-1) return;
    if(type==='like') posts[idx].likes = (posts[idx].likes||0)+1;
    if(type==='dislike') posts[idx].dislikes = (posts[idx].dislikes||0)+1;
    savePosts(posts);
    render();
  }

  function addComment(postId, comment){
    const posts = loadPosts();
    const idx = posts.findIndex(p=>p.id===postId);
    if(idx===-1) return;
    posts[idx].comments = posts[idx].comments||[];
    posts[idx].comments.push(comment);
    savePosts(posts);
    render();
  }

  function deletePost(postId){
    let posts = loadPosts();
    posts = posts.filter(p=>p.id!==postId);
    savePosts(posts);
    render();
  }

  function startEdit(postId){
    // find the post element in DOM
    const postEl = postsContainer.querySelector(`.post[data-post-id="${postId}"]`);
    if(!postEl) return;
    const descEl = postEl.querySelector('.desc');
    const original = descEl ? descEl.innerText : '';

    // replace desc with textarea + save/cancel
    const editWrap = document.createElement('div');
    editWrap.className = 'edit-wrap';
    editWrap.innerHTML = `
      <textarea class="edit-textarea">${escapeHtml(original)}</textarea>
      <div class="edit-controls">
        <button class="save-edit">Save</button>
        <button class="cancel-edit">Cancel</button>
      </div>
    `;

    descEl.replaceWith(editWrap);

    const saveBtn = editWrap.querySelector('.save-edit');
    const cancelBtn = editWrap.querySelector('.cancel-edit');
    const textarea = editWrap.querySelector('.edit-textarea');

    saveBtn.addEventListener('click', ()=>{
      const newDesc = textarea.value.trim();
      updatePostDesc(postId, newDesc);
    });

    cancelBtn.addEventListener('click', ()=>{
      // restore original
      editWrap.replaceWith(createDescElement(original));
    });
  }

  function createDescElement(text){
    const d = document.createElement('div');
    d.className = 'desc';
    d.textContent = text;
    return d;
  }

  function updatePostDesc(postId, newDesc){
    const posts = loadPosts();
    const idx = posts.findIndex(p=>p.id===postId);
    if(idx===-1) return;
    posts[idx].desc = newDesc;
    savePosts(posts);
    render();
  }

  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
  }

  // handle new post form
  postForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const desc = descInput.value.trim();
    if(!desc && !imageInput.files.length) return alert('Please add a description or an image.');

    if(imageInput.files.length){
      const file = imageInput.files[0];
      const reader = new FileReader();
      reader.onload = function(ev){
        createPost(desc, ev.target.result);
      };
      reader.readAsDataURL(file);
    }else{
      createPost(desc, null);
    }

    // reset form
    descInput.value='';
    imageInput.value='';
  });

  function createPost(desc, imageDataUrl){
    const posts = loadPosts();
    const p = {id: uid(), author: 'You', desc: desc, image: imageDataUrl || null, likes:0,dislikes:0,comments:[]};
    posts.push(p);
    savePosts(posts);
    render();
  }

  // initialize
  render();
})();